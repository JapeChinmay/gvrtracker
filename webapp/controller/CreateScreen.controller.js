sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"  
], function (Controller, Filter, FilterOperator, JSONModel, MessageToast, MessageBox, Fragment ) {
    "use strict";

    return Controller.extend("gvtracker.controller.CreateScreen", {

        onInit: function () {
            var oRoute = this.getOwnerComponent().getRouter();
            oRoute.getRoute('RouteCreateScreen').attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            console.log("Create screen opened");
            this._sCustomerId = null;
            var oToday = new Date();
            var sDay = String(oToday.getDate()).padStart(2, "0");
            var sMonth = String(oToday.getMonth() + 1).padStart(2, "0");
            var sYear = oToday.getFullYear();
            var sDate = sDay + "/" + sMonth + "/" + sYear;

            this.byId("GVRDate").setText(sDate)
        },

        onAddCustomer: function () {
            this.getOwnerComponent().getRouter().navTo('RouteAddCustomer');
        },


        onMobileChange: function (oEvent) {
            var sMobile = oEvent.getSource().getValue();

            if (sMobile.length !== 10) {
                this.byId('custBillInfo').setEnabled(false);
                this._sCustomerId = null;
                return;
            }

            var oModel = this.getView().getModel();
            oModel.read("/CustomerSet", {
                filters: [new Filter("phone", FilterOperator.EQ, sMobile)],
                success: function (oData) {
                    if (oData.results.length > 0) {
                    
                        this._sCustomerId = oData.results[0].ID;
                        console.log("customer_ID:", this._sCustomerId);
                        this.byId('custBillInfo').setEnabled(true);
                        this.byId('addCustInfo').setEnabled(false);
                    } else {
                        this._sCustomerId = null;
                        this.byId('custBillInfo').setEnabled(false);
                        MessageToast.show("Customer Not Found");
                    }
                }.bind(this),
                error: function () {
                    this._sCustomerId = null;
                    this.byId('custBillInfo').setEnabled(false);
                    MessageBox.error("Error Occurred");
                }.bind(this)
            });
        },
onMobileValueHelp: function () {
    var oView = this.getView();

    if (!this._oCustomerDialogPromise) {
        this._oCustomerDialogPromise = Fragment.load({
            id: oView.getId(),
            name: "gvtracker.fragments.CustomerValueHelp",
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

        onCustomerSelect: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            this._sCustomerId = oContext.getProperty("ID");
            var phone = oContext.getProperty("phone");
            console.log("Customer selected - ID:", this._sCustomerId, "Phone:", phone);
            this.byId("mobileInput").setValue(phone);
            this.setEnabledState();
            this.oCustomerDialog.close();
        },

        onCampaignValueHelp: function () {
            if (!this.campaignValueHelpDialog) {
                this.campaignValueHelpDialog = sap.ui.xmlfragment(
                    "gvtracker.fragments.CampaignValueHelp", this
                );
                this.getView().addDependent(this.campaignValueHelpDialog);
            }
            this.campaignValueHelpDialog.open();
        },

        onSelectionChange: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            this.byId('camPaignVlaueHelp').setValue(oItem.getTitle());
            this.setEnabledState();
            this.campaignValueHelpDialog.close();
        },

        onCampaignCancel: function () {
            this.campaignValueHelpDialog.close();
        },

        setEnabledState: function () {
            this.byId("custBillInfo").setEnabled(true);
            this.byId('addCustInfo').setEnabled(false);
        },

        onAddCustomerBillInfo: function () {
            var mobileNumber = this.byId('mobileInput').getValue();
            this.getOwnerComponent().getRouter().navTo('RouteAddBillInfo', {
                mobile: mobileNumber
            });
        },


        onIssueItemChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var iEnteredQty = parseInt(oInput.getValue()) || 0;
            var oContext = oInput.getBindingContext();
            var iStock = parseInt(oContext.getProperty('stock'));

            if (iEnteredQty > iStock) {
                oInput.setValue(iStock);
                MessageToast.show("Issue Quantity Cannot Exceed Stock");
            }

            if (iEnteredQty < 1) {
                oInput.setValue(1);
            }

            this._recalculateTotal();
        },


        onCheckBoxSelect: function () {
            this._recalculateTotal();
        },


        _recalculateTotal: function () {
            var oTable = this.byId("giftTable");
            var aItems = oTable.getItems();
            var fTotal = 0;

            aItems.forEach(function (oItem) {
                var oCheckBox = oItem.getCells()[0];
                var oQtyInput = oItem.getCells()[5];
                var oContext = oItem.getBindingContext();

                if (oCheckBox.getSelected()) {
                    var iQty = parseInt(oQtyInput.getValue()) || 0;
                    var fPrice = parseFloat(oContext.getProperty("price")) || 0;
                    fTotal += iQty * fPrice;
                }
            });

            this.byId("totalAssignValue").setText(fTotal.toFixed(2));
        },


        onSubmit: function () {
            var sMobile = this.byId("mobileInput").getValue();
            var sCampaign = this.byId("camPaignVlaueHelp").getValue();


            if (!sMobile) {
                MessageToast.show("Please enter customer mobile.");
                return;
            }
            if (!this._sCustomerId) {
                MessageToast.show("Customer ID not found. Please re-select customer.");
                return;
            }
            if (!sCampaign) {
                MessageToast.show("Please select a campaign.");
                return;
            }


            var oAppModel = this.getOwnerComponent().getModel("appModel");
            var aBillsPayload = oAppModel ? oAppModel.getProperty("/billsPayload") : [];

            if (!aBillsPayload || aBillsPayload.length === 0) {
                MessageToast.show("No bill info found. Please add bill info first.");
                return;
            }


            var oTable = this.byId("giftTable");
            var aItems = oTable.getItems();
            var aAssignVouchers = [];
            var fAssignTotal = 0;

            aItems.forEach(function (oItem) {
                var oCheckBox = oItem.getCells()[0];
                var oQtyInput = oItem.getCells()[5];
                var oContext = oItem.getBindingContext();

                if (oCheckBox.getSelected()) {
                    var iQty = parseInt(oQtyInput.getValue()) || 0;
                    var fPrice = parseFloat(oContext.getProperty("price")) || 0;
                    var fTotal = iQty * fPrice;

                    fAssignTotal += fTotal;

                    aAssignVouchers.push({
                        giftVoucher_ID: oContext.getProperty("ID"),
                        total_amount: fTotal,
                        issue_quantity: iQty
                    });
                }
            });

            if (aAssignVouchers.length === 0) {
                MessageToast.show("Please select at least one gift voucher.");
                return;
            }

            var oPayload = {
                gvr_type_code: "CI",
                cust_type_code: "MALL",
                shoppingMall_plant_code: 8208,
                customer_ID: this._sCustomerId,
                employee_code: 102312,
                assignGiftsTotal_amt: fAssignTotal,
                returnGiftsTotal_amt: 0,
                comment: "",
                campaign_name: sCampaign,
                bills: aBillsPayload,
                assignGiftVouchers: aAssignVouchers,
                returnGiftVouchers: []
            };


            console.log("customer_ID   :", this._sCustomerId);
            console.log("campaign_name :", sCampaign);
            console.log("bills         :", aBillsPayload);
            console.log("assignVouchers:", aAssignVouchers);
            console.log("Full payload  :", JSON.stringify(oPayload, null, 2));

            var oDataModel = this.getView().getModel();
            oDataModel.create("/GVHeaderSet", oPayload, {
                success: function (oData) {
                    console.log("SUCCESS", oData);
                    MessageToast.show("Gift Voucher created successfully!");
                    this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
                }.bind(this),
                error: function (oErr) {
                    console.error("FAILED ", oErr);
                    MessageBox.error("Submit failed. Please try again.");
                }
            });
        },

        onCancel: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        }
    });
});