sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, Fragment) {
    "use strict";

    return Controller.extend("gvtracker.controller.ReturnScreen", {


        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteReturnScreen").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
        
            this._sCustomerId = null;
            this._oCustomerDialogPromise = null;

            this.byId("mobileInputReturn").setValue("");
            this.byId("inputEmployee").setValue("");
            this.byId("txtMall").setText("");
            this.byId("txtTotalReturnValue").setText("0");
            this.byId("inputComments").setValue("");

            var oToday = new Date();
            var sDate = String(oToday.getDate()).padStart(2, "0") + "/" +
                String(oToday.getMonth() + 1).padStart(2, "0") + "/" +
                oToday.getFullYear();
            this.byId("txtGVRDate").setText(sDate);

       
            var oEmptyModel = new JSONModel({ nodes: [] });
            this.getView().setModel(oEmptyModel, "treeModel");
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

        onCustomerDialogClose: function () {
            if (this.oCustomerDialog) {
                this.oCustomerDialog.close();
            }
        },

        onCustomerSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oTable = Fragment.byId(this.getView().getId(), "customerTable");

            if (!oTable) {
                return;
            }

            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                var aFilters = [
                    new Filter([
                        new Filter("phone", FilterOperator.Contains, sQuery),
                        new Filter("name", FilterOperator.Contains, sQuery),
                        new Filter("email", FilterOperator.Contains, sQuery)
                    ], false) // false = OR
                ];
                oBinding.filter(aFilters);
            } else {
                oBinding.filter([]);
            }
        },

        onCustomerSelect: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            this._sCustomerId = oContext.getProperty("ID");
            var sPhone = oContext.getProperty("phone");
            var sName = oContext.getProperty("name");

            this.byId("mobileInputReturn").setValue(sPhone);
            this.byId("inputEmployee").setValue(""); 

            if (this.oCustomerDialog) {
                this.oCustomerDialog.close();
            }

          
            this.callCustomerVoucher();
        },

    

        onMobileChange: function (oEvent) {
            var sMobile = oEvent.getSource().getValue();

            if (sMobile.length !== 10) {
                this._sCustomerId = null;
                this.getView().setModel(new JSONModel({ nodes: [] }), "treeModel");
                this.byId("txtTotalReturnValue").setText("0");
                return;
            }

            var oModel = this.getView().getModel();
            oModel.read("/CustomerSet", {
                filters: [new Filter("phone", FilterOperator.EQ, sMobile)],
                success: function (oData) {
                    if (oData.results.length > 0) {
                        this._sCustomerId = oData.results[0].ID;
                        this.callCustomerVoucher();
                    } else {
                        this._sCustomerId = null;
                        this.getView().setModel(new JSONModel({ nodes: [] }), "treeModel");
                        MessageToast.show("Customer not found.");
                    }
                }.bind(this),
                error: function () {
                    this._sCustomerId = null;
                    MessageBox.error("Error while searching customer.");
                }.bind(this)
            });
        },


        callCustomerVoucher: function () {
            var oModel = this.getView().getModel();

            if (!this._sCustomerId) {
                MessageToast.show("No customer selected.");
                return;
            }

            oModel.read("/GVHeaderSet", {
                filters: [
                    new Filter("customer_ID", FilterOperator.EQ, this._sCustomerId),
                    new Filter("gvr_type_code", FilterOperator.EQ, "CI")
                ],
                urlParameters: {
                    "$expand": "assignGiftVouchers($expand=giftVoucher),campaign,customer"
                },
                success: function (oData) {
                    var aResults = oData.results || [];

                    if (aResults.length === 0) {
                        MessageToast.show("No assigned vouchers found for this customer.");
                        this.getView().setModel(new JSONModel({ nodes: [] }), "treeModel");
                        return;
                    }

       
                    var oFirst = aResults[0];
                    this.byId("txtMall").setText(
                        String(oFirst.shoppingMall_plant_code || "")
                    );
                    this.byId("inputEmployee").setValue(
                        String(oFirst.employee_code || "")
                    );
       
                   
                
                    var aTreeNodes = this._buildTreeNodes(aResults);

                    var oTreeModel = new JSONModel({ nodes: aTreeNodes });
                    this.getView().setModel(oTreeModel, "treeModel");

                    var oTreeTable = this.byId("assignedGiftsTree");
                    oTreeTable.bindRows({
                        path: "treeModel>/nodes",
                        parameters: {
                            arrayNames: ["nodes"]
                        }
                    });

                
                    oTreeTable.expandToLevel(1);

                    this.byId("txtTotalReturnValue").setText("0");
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading GVHeaderSet:", oErr);
                    MessageBox.error("Failed to load assigned vouchers.");
                }
            });
        },



        _buildTreeNodes: function (aResults) {
            return aResults.map(function (oHeader) {
                var aAssigned = (oHeader.assignGiftVouchers && oHeader.assignGiftVouchers.results) || [];

               // building nodes to assign 
                var aChildren = aAssigned.map(function (oAssign, iIdx) {
                    var oGV = oAssign.giftVoucher || {};
                    return {
                        gvr_no:           String(iIdx + 1),
                        campaign:         "",
                        issueDate:        "",
                        coupon:           oGV.coupon   || "",
                        material:         oGV.material || "",
                        descr:            oGV.descr    || "",
                        brand:            oGV.brand    || "",
                        price:            oGV.price    || "0.00",
                        issue_quantity:   String(oAssign.issue_quantity || 0),
                        return_quantity:  "0",
                        expiryDate:       this._formatODataDate(oGV.expDate),
                        totalAmount:      oAssign.total_amount || "0.00",
                        isLeaf:           true,
                        assignId:         oAssign.ID,
                        giftVoucherId:    oGV.ID || "",
                        nodes:            []
                    };
                }.bind(this));

                // Parent row
                return {
                    gvr_no:          oHeader.gv_no || "",
                    campaign:        oHeader.campaign_name || "",
                    issueDate:       this._formatODataDateLong(oHeader.createdAt),
                    coupon:          "",
                    material:        "",
                    descr:           "",
                    brand:           "",
                    price:           "",
                    issue_quantity:  "",
                    return_quantity: "",
                    expiryDate:      "",
                    totalAmount:     oHeader.assignGiftsTotal_amt || "0.00",
                    isLeaf:          false,
                    headerId:        oHeader.ID,
                    nodes:           aChildren
                };
            }.bind(this));
        },


       _formatODataDate: function (oDateVal) {
    if (!oDateVal) { return ""; }
    var oDate = (oDateVal instanceof Date) ? oDateVal : new Date(oDateVal);
    if (isNaN(oDate.getTime())) { return ""; }
    return oDate.toLocaleDateString("en-GB", {
        day:   "2-digit",
        month: "short",
        year:  "numeric"
    });
},

        
_formatODataDateLong: function (oDateVal) {
    if (!oDateVal) { return ""; }
    var oDate = (oDateVal instanceof Date) ? oDateVal : new Date(oDateVal);
    if (isNaN(oDate.getTime())) { return ""; }
    return oDate.toLocaleDateString("en-GB", {
        day:   "2-digit",
        month: "short",
        year:  "numeric"
    });
},

  

        onCollapseAll: function () {
            this.byId("assignedGiftsTree").collapseAll();
        },

        onCollapseSelection: function () {
            var oTable = this.byId("assignedGiftsTree");
            var aIndices = oTable.getSelectedIndices();
            aIndices.forEach(function (iIndex) {
                oTable.collapse(iIndex);
            });
        },

        onExpandFirstLevel: function () {
            this.byId("assignedGiftsTree").expandToLevel(1);
        },

        onExpandSelection: function () {
            var oTable = this.byId("assignedGiftsTree");
            var aIndices = oTable.getSelectedIndices();
            aIndices.forEach(function (iIndex) {
                oTable.expand(iIndex);
            });
        },

        onRowSelectionChange: function () {
            // Reserved for future row selection logic
        },



        onReturnQtyChange: function (oEvent) {
            var oInput   = oEvent.getSource();
            var oContext = oInput.getBindingContext("treeModel");

            if (!oContext) { return; }

            var iEnteredQty = parseInt(oInput.getValue(), 10) || 0;
            var iIssueQty   = parseInt(oContext.getProperty("issue_quantity"), 10) || 0;

            // cannot exceed issue qty
            if (iEnteredQty > iIssueQty) {
                MessageToast.show("Return quantity cannot exceed issue quantity (" + iIssueQty + ").");
                iEnteredQty = iIssueQty;
                oInput.setValue(String(iEnteredQty));
            }

            // cannot be negative
            if (iEnteredQty < 0) {
                iEnteredQty = 0;
                oInput.setValue("0");
            }

            
            oContext.getModel().setProperty(
                oContext.getPath() + "/return_quantity",
                String(iEnteredQty)
            );

            this._recalculateTotalReturnValue();
        },

    

        _recalculateTotalReturnValue: function () {
            var oTreeModel = this.getView().getModel("treeModel");
            if (!oTreeModel) { return; }

            var aNodes = oTreeModel.getProperty("/nodes") || [];
            var fTotal = 0;

            aNodes.forEach(function (oParent) {
                var aChildren = oParent.nodes || [];
                aChildren.forEach(function (oChild) {
                    var iReturnQty = parseInt(oChild.return_quantity, 10) || 0;
                    var fPrice     = parseFloat(oChild.price) || 0;
                    fTotal += iReturnQty * fPrice;
                });
            });

            this.byId("txtTotalReturnValue").setText(fTotal.toFixed(2));
        },


onSubmit: function () {
    var sMobile  = this.byId("mobileInputReturn").getValue();
    var sComment = this.byId("inputComments").getValue();

    if (!sMobile) {
        MessageToast.show("Please enter or select a customer mobile.");
        return;
    }
    if (!this._sCustomerId) {
        MessageToast.show("Customer not found. Please select a valid customer.");
        return;
    }

    var oTreeModel      = this.getView().getModel("treeModel");
    var aNodes          = oTreeModel ? (oTreeModel.getProperty("/nodes") || []) : [];
    var aReturnVouchers = [];
    var fReturnTotal    = 0;

    aNodes.forEach(function (oParent) {
        var sHeaderId = oParent.headerId;  
        (oParent.nodes || []).forEach(function (oChild) {
            var iReturnQty = parseInt(oChild.return_quantity, 10) || 0;
            if (iReturnQty > 0) {
                var fPrice       = parseFloat(oChild.price) || 0;
                var fTotalAmount = iReturnQty * fPrice;
                fReturnTotal    += fTotalAmount;

                aReturnVouchers.push({
                    giftVoucher_ID:        oChild.giftVoucherId,
                    total_amount:          fTotalAmount,
                    issue_quantity:        iReturnQty,
                    returnedGVHeader_ID:   sHeaderId,
                    RT_Ass_GiftVoucher_ID: oChild.assignId
                });
            }
        });
    });

    if (aReturnVouchers.length === 0) {
        MessageToast.show("Please enter a return quantity for at least one item.");
        return;
    }

    var oPayload = {
        gvr_type_code:           "RT",
        shoppingMall_plant_code: 8208,
        customer_ID:             this._sCustomerId,
        employee_code:           102312,
        returnGiftsTotal_amt:    fReturnTotal,
        comment:                 sComment,
        returnGiftVouchers:      aReturnVouchers
    };

    console.log("Return payload:", JSON.stringify(oPayload, null, 2));

    var oDataModel = this.getView().getModel();
    oDataModel.create("/GVHeaderSet", oPayload, {
        success: function (oData) {
            console.log("Return submitted successfully:", oData);
            MessageToast.show("Return submitted successfully!");
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        }.bind(this),
        error: function (oErr) {
            console.error("Return submit failed:", oErr);
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
},

   

        onCancel: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        },

        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        }

    });
});