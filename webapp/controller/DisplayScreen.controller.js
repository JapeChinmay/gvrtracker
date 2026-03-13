sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    // GVR type codes
    var GVR_TYPE = {
        CREATE:      "CI",
        RETURN:      "RT",
        REPLACEMENT: "RP"
    };

    // Expand strings per mode
    var EXPAND = {
        CREATE:      "customer,assignGiftVouchers/giftVoucher,campaign",
        RETURN:      "customer,returnGiftVouchers/giftVoucher,returnGiftVouchers/returnedGVHeader",
        REPLACEMENT: "customer,assignGiftVouchers/giftVoucher,returnGiftVouchers/giftVoucher,returnGiftVouchers/returnedGVHeader,campaign"
    };

    return Controller.extend("gvtracker.controller.DisplayScreen", {

        /* ============================================================ */
        /*  LIFECYCLE                                                     */
        /* ============================================================ */

        onInit: function () {
            // Default mode = Create (index 0)
            this._sCurrentMode = "CREATE";

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDisplayScreen")
                   .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sGVR = oEvent.getParameter("arguments").gvr;

            // Reset detail panel
            this._clearDetailPanel();

            // Reset radio to Create
            this.byId("displayModeSelect").setSelectedIndex(0);
            this._sCurrentMode = "CREATE";

            // Reload GVR list for CREATE mode
            this._reloadGVRList();

            // If a GVR was passed via route, load it
            if (sGVR) {
                this._loadGVRByNumber(sGVR);
            }
        },

        /* ============================================================ */
        /*  RADIO BUTTON — MODE SWITCH                                   */
        /* ============================================================ */

        onDisplayModeSelect: function (oEvent) {
            var iIndex = oEvent.getSource().getSelectedIndex();

            if (iIndex === 0)      { this._sCurrentMode = "CREATE"; }
            else if (iIndex === 1) { this._sCurrentMode = "RETURN"; }
            else if (iIndex === 2) { this._sCurrentMode = "REPLACEMENT"; }

            // Clear detail and reload filtered list
            this._clearDetailPanel();
            this._reloadGVRList();
        },

        /* ============================================================ */
        /*  GVR LIST — load filtered by gvr_type_code                   */
        /* ============================================================ */

        _reloadGVRList: function () {
            var oList    = this.byId("gvrList");
            var oBinding = oList.getBinding("items");

            if (!oBinding) { return; }

            var sTypeCode = GVR_TYPE[this._sCurrentMode];
            oBinding.filter([
                new Filter("gvr_type_code", FilterOperator.EQ, sTypeCode)
            ]);
        },

        /* ============================================================ */
        /*  GVR LIST — search                                            */
        /* ============================================================ */

        onGVRListSearch: function (oEvent) {
            var sQuery   = oEvent.getParameter("query") ||
                           oEvent.getParameter("newValue") || "";
            var oList    = this.byId("gvrList");
            var oBinding = oList.getBinding("items");
            var sTypeCode = GVR_TYPE[this._sCurrentMode];

            var aFilters = [
                new Filter("gvr_type_code", FilterOperator.EQ, sTypeCode)
            ];

            if (sQuery) {
                aFilters.push(new Filter("gv_no", FilterOperator.Contains, sQuery));
            }

            oBinding.filter(aFilters);
        },

        /* ============================================================ */
        /*  GVR LIST ITEM SELECT                                         */
        /* ============================================================ */

        onGVRItemSelect: function (oEvent) {
            var oItem    = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext();
            var sPath    = oContext.getPath();
            var oModel   = this.getView().getModel();
            var oView    = this.getView();

            // Set header fields immediately from existing context
            this._setDetailContext(oContext);

            // Then do a deep-expand read to get nested data
            oModel.read(sPath, {
                urlParameters: {
                    "$expand": EXPAND[this._sCurrentMode]
                },
                success: function () {
                    // Re-set context after expanded data arrives
                    this._setDetailContext(oContext);
                    this._applyTableVisibility();
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading GVR details:", oErr);
                    MessageBox.error("Error loading GVR details.");
                }
            });
        },

        /* ============================================================ */
        /*  LOAD GVR BY NUMBER (from route param)                        */
        /* ============================================================ */

        _loadGVRByNumber: function (sGVR) {
            var oModel = this.getView().getModel();
            oModel.read("/GVHeaderSet", {
                filters: [
                    new Filter("gv_no", FilterOperator.EQ, sGVR)
                ],
                urlParameters: {
                    "$expand": EXPAND[this._sCurrentMode]
                },
                success: function (oData) {
                    if (oData.results.length > 0) {
                        var oResult = oData.results[0];
                        var sPath   = "/GVHeaderSet(guid'" + oResult.ID + "')";
                        var oContext = oModel.getContext(sPath);
                        this._setDetailContext(oContext);
                        this._applyTableVisibility();
                    } else {
                        MessageToast.show("GVR not found: " + sGVR);
                    }
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading GVR:", oErr);
                    MessageBox.error("Error loading GVR details.");
                }
            });
        },

        /* ============================================================ */
        /*  SET DETAIL CONTEXT — binds all detail controls               */
        /* ============================================================ */

        _setDetailContext: function (oContext) {
            var oView = this.getView();
            var aIds  = [
                "detailGVRNo", "detailGVRType", "detailTotalAssignValue",
                "detailTotalReturnValue", "detailCustType", "detailCustMobile",
                "detailCampaign", "detailGVRDate", "detailEmployee",
                "detailMall", "detailComments"
            ];

            aIds.forEach(function (sId) {
                var oCtrl = oView.byId(sId);
                if (oCtrl) { oCtrl.setBindingContext(oContext); }
            });

            // Bind tables
            oView.byId("assignGiftItemsTable").setBindingContext(oContext);
            oView.byId("returnGiftItemsTable").setBindingContext(oContext);

            this._applyTableVisibility();
        },

        /* ============================================================ */
        /*  TABLE VISIBILITY per mode                                    */
        /* ============================================================ */

        _applyTableVisibility: function () {
            var oView = this.getView();
            var sMode = this._sCurrentMode;

            // Titles
            oView.byId("assignTableTitle").setVisible(
                sMode === "CREATE" || sMode === "REPLACEMENT"
            );
            oView.byId("returnTableTitle").setVisible(
                sMode === "RETURN" || sMode === "REPLACEMENT"
            );

            // Tables
            oView.byId("assignGiftItemsTable").setVisible(
                sMode === "CREATE" || sMode === "REPLACEMENT"
            );
            oView.byId("returnGiftItemsTable").setVisible(
                sMode === "RETURN" || sMode === "REPLACEMENT"
            );

            // Total fields — show relevant one
            oView.byId("lblTotalAssign").setVisible(
                sMode === "CREATE" || sMode === "REPLACEMENT"
            );
            oView.byId("detailTotalAssignValue").setVisible(
                sMode === "CREATE" || sMode === "REPLACEMENT"
            );
            oView.byId("lblTotalReturn").setVisible(
                sMode === "RETURN" || sMode === "REPLACEMENT"
            );
            oView.byId("detailTotalReturnValue").setVisible(
                sMode === "RETURN" || sMode === "REPLACEMENT"
            );

            // Campaign only shown for CREATE and REPLACEMENT
            oView.byId("lblCampaign").setVisible(
                sMode === "CREATE" || sMode === "REPLACEMENT"
            );
            oView.byId("detailCampaign").setVisible(
                sMode === "CREATE" || sMode === "REPLACEMENT"
            );

            // View Bill Info button only for CREATE
            oView.byId("viewBillInfoBtn").setVisible(sMode === "CREATE");
        },

        /* ============================================================ */
        /*  CLEAR DETAIL PANEL                                           */
        /* ============================================================ */

        _clearDetailPanel: function () {
            var oView = this.getView();
            var aIds  = [
                "detailGVRNo", "detailGVRType", "detailTotalAssignValue",
                "detailTotalReturnValue", "detailCustType", "detailCustMobile",
                "detailCampaign", "detailGVRDate", "detailEmployee",
                "detailMall", "detailComments"
            ];
            aIds.forEach(function (sId) {
                var oCtrl = oView.byId(sId);
                if (oCtrl) { oCtrl.setBindingContext(null); }
            });
            oView.byId("assignGiftItemsTable").setBindingContext(null);
            oView.byId("returnGiftItemsTable").setBindingContext(null);
        },

        /* ============================================================ */
        /*  VIEW BILL INFO                                                */
        /* ============================================================ */

        onViewBillInfo: function () {
            var oContext = this.byId("detailGVRNo").getBindingContext();
            if (!oContext) {
                MessageToast.show("Please select a GVR first.");
                return;
            }
            var sGVRID = oContext.getObject().ID;
            this.getOwnerComponent().getRouter().navTo("RouteViewBillInfoScreen", {
                custID: sGVRID
            });
        },

        /* ============================================================ */
        /*  NAVIGATION                                                    */
        /* ============================================================ */

        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        }

    });
});