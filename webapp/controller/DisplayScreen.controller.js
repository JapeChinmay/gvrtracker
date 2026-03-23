sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    var GVR_TYPE = {
        CREATE:      "CI",
        RETURN:      "RT",
        REPLACEMENT: "RP"
    };

    var EXPAND = {
        CREATE:      "customer,assignGiftVouchers/giftVoucher,campaign",
        RETURN:      "customer,returnGiftVouchers/giftVoucher,returnGiftVouchers/returnedGVHeader",
        REPLACEMENT: "customer,assignGiftVouchers/giftVoucher,returnGiftVouchers/giftVoucher,returnGiftVouchers/returnedGVHeader,campaign"
    };

    return Controller.extend("gvtracker.controller.DisplayScreen", {

        onInit: function () {
            this._sCurrentMode = "CREATE";
        

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDisplayScreen")
                   .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sGVR = oEvent.getParameter("arguments").gvr;

            this._clearDetailPanel();
            this.byId("displayModeSelect").setSelectedIndex(0);
            this._sCurrentMode = "CREATE";
            this._reloadGVRList();

            if (sGVR) {
                this._loadGVRByNumber(sGVR);
            }
        },

        onShowMaster: function () {
            this.byId("displaySplitApp").showMaster();
        },

      
        onDisplayModeSelect: function (oEvent) {
            var iIndex = oEvent.getSource().getSelectedIndex();
            if (iIndex === 0)      { this._sCurrentMode = "CREATE"; }
            else if (iIndex === 1) { this._sCurrentMode = "RETURN"; }
            else if (iIndex === 2) { this._sCurrentMode = "REPLACEMENT"; }

            this._clearDetailPanel();
            this._reloadGVRList();
        },

        _reloadGVRList: function () {
            var oList    = this.byId("gvrList");
            var oBinding = oList.getBinding("items");
            if (!oBinding) { return; }

            oBinding.filter([
                new Filter("gvr_type_code", FilterOperator.EQ, GVR_TYPE[this._sCurrentMode])
            ]);
        },

        onGVRListSearch: function (oEvent) {
            var sQuery    = oEvent.getParameter("query") ||
                            oEvent.getParameter("newValue") || "";
            var oList     = this.byId("gvrList");
            var oBinding  = oList.getBinding("items");
            var sTypeCode = GVR_TYPE[this._sCurrentMode];

            var aFilters = [
                new Filter("gvr_type_code", FilterOperator.EQ, sTypeCode)
            ];
            if (sQuery) {
                aFilters.push(new Filter("gv_no", FilterOperator.Contains, sQuery));
            }
            oBinding.filter(aFilters);
        },

    
        onGVRItemSelect: function (oEvent) {
            var oItem    = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext();
            var sPath    = oContext.getPath();
            var oModel   = this.getView().getModel();

            this.byId("emptyState").setVisible(false);
            this.byId("detailContent").setVisible(true);

            this._setDetailContext(oContext);

            oModel.read(sPath, {
                urlParameters: { "$expand": EXPAND[this._sCurrentMode] },
                success: function () {
                    this._setDetailContext(oContext);
                    this._applyTableVisibility();
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading GVR details:", oErr);
                    MessageBox.error("Error loading GVR details.");
                }
            });

       
            this.byId("displaySplitApp").toDetail(
                this.byId("detailPage").getId()
            );
        },

 
        _loadGVRByNumber: function (sGVR) {
            var oModel = this.getView().getModel();
            oModel.read("/GVHeaderSet", {
                filters: [ new Filter("gv_no", FilterOperator.EQ, sGVR) ],
                urlParameters: { "$expand": EXPAND[this._sCurrentMode] },
                success: function (oData) {
                    if (oData.results.length > 0) {
                        var oResult  = oData.results[0];
                        var sPath    = "/GVHeaderSet(guid'" + oResult.ID + "')";
                        var oContext = oModel.getContext(sPath);

                        this.byId("emptyState").setVisible(false);
                        this.byId("detailContent").setVisible(true);

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

            oView.byId("assignGiftItemsTable").setBindingContext(oContext);
            oView.byId("returnGiftItemsTable").setBindingContext(oContext);

            this._applyTableVisibility();
        },

     
        _applyTableVisibility: function () {
            var oView = this.getView();
            var sMode = this._sCurrentMode;

            var bAssign = (sMode === "CREATE" || sMode === "REPLACEMENT");
            var bReturn = (sMode === "RETURN" || sMode === "REPLACEMENT");

            oView.byId("assignTableTitle").setVisible(bAssign);
            oView.byId("assignGiftItemsTable").setVisible(bAssign);

            oView.byId("returnTableTitle").setVisible(bReturn);
            oView.byId("returnGiftItemsTable").setVisible(bReturn);

            oView.byId("lblTotalAssign").setVisible(bAssign);
            oView.byId("detailTotalAssignValue").setVisible(bAssign);

            oView.byId("lblTotalReturn").setVisible(bReturn);
            oView.byId("detailTotalReturnValue").setVisible(bReturn);

            oView.byId("lblCampaign").setVisible(bAssign);
            oView.byId("detailCampaign").setVisible(bAssign);

            oView.byId("viewBillInfoBtn").setVisible(sMode === "CREATE");
        },

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

            oView.byId("emptyState").setVisible(true);
            oView.byId("detailContent").setVisible(false);
        },

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

        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        }

    });
});