sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, Filter, FilterOperator, JSONModel, MessageToast, MessageBox, Fragment) {
    "use strict";

    return Controller.extend("gvtracker.controller.CreateScreen", {

        /* ============================================================ */
        /*  LIFECYCLE                                                     */
        /* ============================================================ */

        onInit: function () {
            var oRoute = this.getOwnerComponent().getRouter();
            oRoute.getRoute("RouteCreateScreen").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            // ── Reset all state on every navigation ──────────────────
            this._sCustomerId = null;
            this._oCustomerDialogPromise = null;

            // Reset header fields
            this.byId("mobileInput").setValue("");
            this.byId("camPaignVlaueHelp").setValue("");
            this.byId("inputEmployee").setValue("102312");
            this.byId("totalAssignValue").setText("0.00");
            this.byId("inputComments").setValue("");

            // Reset button states
            this.byId("custBillInfo").setEnabled(false);
            this.byId("addCustInfo").setEnabled(true);  // BUG FIX: re-enable on every open

            // Set today's date
            var oToday  = new Date();
            var sDate   = String(oToday.getDate()).padStart(2, "0") + "/" +
                          String(oToday.getMonth() + 1).padStart(2, "0") + "/" +
                          oToday.getFullYear();
            this.byId("GVRDate").setText(sDate);

            // Clear bill payload in app model
            var oAppModel = this.getOwnerComponent().getModel("appModel");
            if (oAppModel) {
                oAppModel.setProperty("/billsPayload", []);
            }

            // Deselect all checkboxes and reset total
            this._resetTableSelections();
        },

        /* ============================================================ */
        /*  RESET TABLE CHECKBOXES                                       */
        /* ============================================================ */

        _resetTableSelections: function () {
            var oTable = this.byId("giftTable");
            if (!oTable) { return; }
            oTable.getItems().forEach(function (oItem) {
                var oCheckBox = oItem.getCells()[0];
                var oQtyInput = oItem.getCells()[5];
                if (oCheckBox) { oCheckBox.setSelected(false); }
                if (oQtyInput) { oQtyInput.setValue("1"); }
            });
            this.byId("totalAssignValue").setText("0.00");
        },

        /* ============================================================ */
        /*  NAVIGATION                                                   */
        /* ============================================================ */

        onAddCustomer: function () {
            this.getOwnerComponent().getRouter().navTo("RouteAddCustomer");
        },

        onAddCustomerBillInfo: function () {
            var sMobile = this.byId("mobileInput").getValue();
            this.getOwnerComponent().getRouter().navTo("RouteAddBillInfo", {
                mobile: sMobile
            });
        },

        onCancel: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        },

        /* ============================================================ */
        /*  CUSTOMER VALUE HELP                                          */
        /* ============================================================ */

        onMobileValueHelp: function () {
            var oView = this.getView();

            if (!this._oCustomerDialogPromise) {
                this._oCustomerDialogPromise = Fragment.load({
                    id:         oView.getId(),
                    name:       "gvtracker.fragments.CustomerValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    this.oCustomerDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            this._oCustomerDialogPromise.then(function (oDialog) {
                oDialog.open();
            });
        },

        // BUG FIX: was missing — fragment Cancel button calls this
        onCustomerDialogClose: function () {
            if (this.oCustomerDialog) {
                this.oCustomerDialog.close();
            }
        },

        onCustomerSearch: function (oEvent) {
            var sQuery   = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oTable   = Fragment.byId(this.getView().getId(), "customerTable");
            if (!oTable) { return; }
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                oBinding.filter([new Filter([
                    new Filter("phone", FilterOperator.Contains, sQuery),
                    new Filter("name",  FilterOperator.Contains, sQuery),
                    new Filter("email", FilterOperator.Contains, sQuery)
                ], false)]);
            } else {
                oBinding.filter([]);
            }
        },

        onCustomerSelect: function (oEvent) {
            var oContext      = oEvent.getSource().getBindingContext();
            this._sCustomerId = oContext.getProperty("ID");
            var sPhone        = oContext.getProperty("phone");
            this.byId("mobileInput").setValue(sPhone);
            this._setEnabledState();
            if (this.oCustomerDialog) { this.oCustomerDialog.close(); }
        },

        /* ============================================================ */
        /*  MOBILE LIVE CHANGE (manual typing)                           */
        /* ============================================================ */

        onMobileChange: function (oEvent) {
            var sMobile = oEvent.getSource().getValue();

            if (sMobile.length !== 10) {
                this.byId("custBillInfo").setEnabled(false);
                // BUG FIX: re-enable Add Customer Profile when mobile is cleared
                this.byId("addCustInfo").setEnabled(true);
                this._sCustomerId = null;
                return;
            }

            var oModel = this.getView().getModel();
            oModel.read("/CustomerSet", {
                filters: [new Filter("phone", FilterOperator.EQ, sMobile)],
                success: function (oData) {
                    if (oData.results.length > 0) {
                        this._sCustomerId = oData.results[0].ID;
                        this._setEnabledState();
                    } else {
                        this._sCustomerId = null;
                        this.byId("custBillInfo").setEnabled(false);
                        this.byId("addCustInfo").setEnabled(true);
                        MessageToast.show("Customer not found.");
                    }
                }.bind(this),
                error: function () {
                    this._sCustomerId = null;
                    this.byId("custBillInfo").setEnabled(false);
                    MessageBox.error("Error occurred while searching customer.");
                }.bind(this)
            });
        },

        _setEnabledState: function () {
            this.byId("custBillInfo").setEnabled(true);
            this.byId("addCustInfo").setEnabled(false);
        },

        /* ============================================================ */
        /*  CAMPAIGN VALUE HELP                                          */
        /* ============================================================ */

        onCampaignValueHelp: function () {
            var oView = this.getView();

            if (!this._oCampaignDialogPromise) {
                this._oCampaignDialogPromise = Fragment.load({
                    id:         oView.getId(),
                    name:       "gvtracker.fragments.CampaignValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    this.campaignValueHelpDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }

            this._oCampaignDialogPromise.then(function (oDialog) {
                oDialog.open();
            });
        },

        onSelectionChange: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            this.byId("camPaignVlaueHelp").setValue(oItem.getTitle());
            if (this.campaignValueHelpDialog) {
                this.campaignValueHelpDialog.close();
            }
        },

        onCampaignCancel: function () {
            if (this.campaignValueHelpDialog) {
                this.campaignValueHelpDialog.close();
            }
        },

        /* ============================================================ */
        /*  GIFT TABLE — QTY + CHECKBOX                                  */
        /* ============================================================ */

        // BUG FIX: use "change" not "liveChange" — liveChange fires on every
        // keystroke so typing "12" would first fire for "1" and clamp it
        onIssueItemChange: function (oEvent) {
            var oInput      = oEvent.getSource();
            var iEnteredQty = parseInt(oInput.getValue(), 10) || 0;
            var oContext    = oInput.getBindingContext();
            var iStock      = parseInt(oContext.getProperty("stock"), 10) || 0;

            if (iEnteredQty > iStock) {
                oInput.setValue(String(iStock));
                MessageToast.show("Issue quantity cannot exceed stock (" + iStock + ").");
                iEnteredQty = iStock;
            }

            if (iEnteredQty < 1) {
                oInput.setValue("1");
            }

            this._recalculateTotal();
        },

        onCheckBoxSelect: function () {
            this._recalculateTotal();
        },

        _recalculateTotal: function () {
            var oTable  = this.byId("giftTable");
            var aItems  = oTable.getItems();
            var fTotal  = 0;

            aItems.forEach(function (oItem) {
                var oCheckBox = oItem.getCells()[0]; // index 0 = CheckBox
                var oQtyInput = oItem.getCells()[5]; // index 5 = Issue Qty Input
                var oContext  = oItem.getBindingContext();

                if (oCheckBox && oCheckBox.getSelected()) {
                    var iQty   = parseInt(oQtyInput.getValue(), 10) || 0;
                    var fPrice = parseFloat(oContext.getProperty("price")) || 0;
                    fTotal += iQty * fPrice;
                }
            });

            this.byId("totalAssignValue").setText(fTotal.toFixed(2));
        },

        /* ============================================================ */
        /*  SUBMIT                                                        */
        /* ============================================================ */

        onSubmit: function () {
            var sMobile   = this.byId("mobileInput").getValue().trim();
            var sCampaign = this.byId("camPaignVlaueHelp").getValue().trim();
            var sComment  = this.byId("inputComments").getValue();

            // ── Validations ──────────────────────────────────────────
            if (!sMobile) {
                MessageToast.show("Please enter customer mobile.");
                return;
            }
            if (!this._sCustomerId) {
                MessageToast.show("Customer not found. Please re-select customer.");
                return;
            }
            if (!sCampaign) {
                MessageToast.show("Please select a campaign.");
                return;
            }

            var oAppModel    = this.getOwnerComponent().getModel("appModel");
            var aBillsPayload = oAppModel ? (oAppModel.getProperty("/billsPayload") || []) : [];

            if (aBillsPayload.length === 0) {
                MessageToast.show("No bill info found. Please add bill info first.");
                return;
            }

            // ── Collect selected vouchers ────────────────────────────
            var oTable         = this.byId("giftTable");
            var aItems         = oTable.getItems();
            var aAssignVouchers = [];
            var fAssignTotal    = 0;

            aItems.forEach(function (oItem) {
                var oCheckBox = oItem.getCells()[0];
                var oQtyInput = oItem.getCells()[5];
                var oContext  = oItem.getBindingContext();

                if (oCheckBox && oCheckBox.getSelected()) {
                    var iQty    = parseInt(oQtyInput.getValue(), 10) || 0;
                    var fPrice  = parseFloat(oContext.getProperty("price")) || 0;
                    var fAmount = iQty * fPrice;

                    fAssignTotal += fAmount;
                    aAssignVouchers.push({
                        giftVoucher_ID: oContext.getProperty("ID"),
                        total_amount:   fAmount,
                        issue_quantity: iQty
                    });
                }
            });

            if (aAssignVouchers.length === 0) {
                MessageToast.show("Please select at least one gift voucher.");
                return;
            }

            // ── Build payload ────────────────────────────────────────
            var oPayload = {
                gvr_type_code:           "CI",
                cust_type_code:          "MALL",
                shoppingMall_plant_code: 8208,
                customer_ID:             this._sCustomerId,
                employee_code:           102312,
                assignGiftsTotal_amt:    fAssignTotal,
                returnGiftsTotal_amt:    0,
                comment:                 sComment,
                campaign_name:           sCampaign,
                bills:                   aBillsPayload,
                assignGiftVouchers:      aAssignVouchers,
                returnGiftVouchers:      []
            };

            console.log("Payload:", JSON.stringify(oPayload, null, 2));

            // ── POST ─────────────────────────────────────────────────
            var oDataModel = this.getView().getModel();
            oDataModel.create("/GVHeaderSet", oPayload, {
                success: function (oData) {
                    console.log("SUCCESS:", oData);
                    var sNewGVR = oData.gv_no || "";
                    MessageToast.show(
                        "Gift Voucher created successfully!" +
                        (sNewGVR ? " GVR: " + sNewGVR : "")
                    );
                    this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
                }.bind(this),
                // BUG FIX: was missing .bind(this) — 'this' was undefined in error cb
                error: function (oErr) {
                    console.error("FAILED:", oErr);
                    var sMsg = "Submit failed. Please try again.";
                    try {
                        var oErrBody = JSON.parse(oErr.responseText);
                        if (oErrBody && oErrBody.error && oErrBody.error.message) {
                            sMsg = oErrBody.error.message.value || sMsg;
                        }
                    } catch (e) { /* ignore parse error */ }
                    MessageBox.error(sMsg);
                }.bind(this)
            });
        }

    });
});