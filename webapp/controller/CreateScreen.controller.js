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

       


        onInit: function () {
            var oRoute = this.getOwnerComponent().getRouter();
            oRoute.getRoute("RouteCreateScreen").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          
            this._sCustomerId = null;
        

            this.byId("mobileCustomerInput").setValue("");
            this.byId("camPaignVlaueHelp").setValue("");
            this.byId("inputEmployee").setValue("102312");
            this.byId("totalAssignValue").setText("0.00");
            this.byId("inputComments").setValue("");

        
            this.byId("custBillInfo").setEnabled(false);
            this.byId("addCustInfo").setEnabled(true); 

            var oToday  = new Date();
            var sDate   = String(oToday.getDate()).padStart(2, "0") + "/" +
                          String(oToday.getMonth() + 1).padStart(2, "0") + "/" +
                          oToday.getFullYear();
            this.byId("GVRDate").setText(sDate);

            var oAppModel = this.getOwnerComponent().getModel("appModel");
            if (oAppModel) {
                oAppModel.setProperty("/billsPayload", []);
            }

       
            this._resetTableSelections();
        },


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


        onAddCustomer: function () {
            this.getOwnerComponent().getRouter().navTo("RouteAddCustomer");
        },

        onAddCustomerBillInfo: function () {
            var sMobile = this.byId("mobileCustomerInput").getValue();
            this.getOwnerComponent().getRouter().navTo("RouteAddBillInfo", {
                mobile: sMobile
            });
        },

        onCancel: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        },

  onMobileValueHelp: function () {
    var oView = this.getView();

    if (this.oCustomerDialog) {          // already loaded — just open
        this.oCustomerDialog.open();
        return;
    }

    Fragment.load({
        id:         oView.getId(),
        name:       "gvtracker.fragments.CustomerValueHelp",
        controller: this
    }).then(function (oDialog) {
        oView.addDependent(oDialog);
        this.oCustomerDialog = oDialog;
        oDialog.open();
    }.bind(this));
},


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
            this.byId("mobileCustomerInput").setValue(sPhone);
            this._setEnabledState();
            if (this.oCustomerDialog) { this.oCustomerDialog.close(); }
        },


        onMobileChange: function (oEvent) {
            var sMobile = oEvent.getSource().getValue();

            if (sMobile.length !== 10) {
                this.byId("custBillInfo").setEnabled(false);
           
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

     
onCampaignValueHelp: function () {
    var oView = this.getView();

    if (this.campaignValueHelpDialog) {  
        this.campaignValueHelpDialog.open();
        return;
    }

    Fragment.load({
        id:         oView.getId(),
        name:       "gvtracker.fragments.CampaignValueHelp",
        controller: this
    }).then(function (oDialog) {
        oView.addDependent(oDialog);
        this.campaignValueHelpDialog = oDialog;
        oDialog.open();
    }.bind(this));
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
                var oQtyInput = oItem.getCells()[5]; // index 5 
                var oContext  = oItem.getBindingContext();

                if (oCheckBox && oCheckBox.getSelected()) {
                    var iQty   = parseInt(oQtyInput.getValue(), 10) || 0;
                    var fPrice = parseFloat(oContext.getProperty("price")) || 0;
                    fTotal += iQty * fPrice;
                }
            });

            this.byId("totalAssignValue").setText(fTotal.toFixed(2));
        },


        onSubmit: function () {
            var sMobile   = this.byId("mobileCustomerInput").getValue().trim();
            var sCampaign = this.byId("camPaignVlaueHelp").getValue().trim();
            var sComment  = this.byId("inputComments").getValue()

            
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

        
            var oPayload = {
                gvr_type_code:           "CI",
                cust_type_code:          "MALL",
                shoppingMall_plant_code: 8208,
                customer_ID:             this._sCustomerId,
                employee_code:           102312,
                 assignGiftsTotal_amt:    fAssignTotal,
                // returnGiftsTotal_amt:    0,
                comment:                 sComment,
                campaign_name:           sCampaign,
                bills:                   aBillsPayload,
                assignGiftVouchers:      aAssignVouchers,
               // returnGiftVouchers:      []
            };

            console.log("Payload:", JSON.stringify(oPayload, null, 2));

      
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
              
                error: function (oErr) {
                    console.error("FAILED:", oErr);
                    var sMsg = "Submit failed. Please try again.";
                    try {
                        var oErrBody = JSON.parse(oErr.responseText);
                        if (oErrBody && oErrBody.error && oErrBody.error.message) {
                            sMsg = oErrBody.error.message.value || sMsg;
                        }
                    } catch (e) {  }
                    MessageBox.error(sMsg);
                }.bind(this)
            });
        }

    });
});