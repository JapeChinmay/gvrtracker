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

    return Controller.extend("gvtracker.controller.ReplacementScreen", {



        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteReplacementScreen").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this._sCustomerId       = null;
            this._oCustomerDialogPromise = null;
            this._fMaxAllowedAssign = 0; // Total return value = max assign budget

            // Reset header fields
            this.byId("mobileInput").setValue("");
            this.byId("inputEmployee").setValue("");
            this.byId("txtMall").setText("");
            this.byId("txtTotalReturnValue").setText("0");
            this.byId("txtTotalAssignValue").setText("0");
            this.byId("inputComments").setValue("");

            // Set today's date
            var oToday = new Date();
            var sDate  = String(oToday.getDate()).padStart(2, "0") + "/" +
                         String(oToday.getMonth() + 1).padStart(2, "0") + "/" +
                         oToday.getFullYear();
            this.byId("txtGVRDate").setText(sDate);

            // Clear both models
            this.getView().setModel(new JSONModel({ nodes: [] }), "treeModel");
            this.getView().setModel(new JSONModel({ items: [] }), "giftModel");
        },


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

        onCustomerDialogClose: function () {
            if (this.oCustomerDialog) {
                this.oCustomerDialog.close();
            }
        },

        onCustomerSearch: function (oEvent) {
            var sQuery  = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oTable  = Fragment.byId(this.getView().getId(), "customerTable");
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
            if (this.oCustomerDialog) { this.oCustomerDialog.close(); }
            this._loadAllData();
        },

    

        onMobileChange: function (oEvent) {
            var sMobile = oEvent.getSource().getValue();
            if (sMobile.length !== 10) {
                this._sCustomerId = null;
                this._resetAllData();
                return;
            }
            var oModel = this.getView().getModel();
            oModel.read("/CustomerSet", {
                filters: [new Filter("phone", FilterOperator.EQ, sMobile)],
                success: function (oData) {
                    if (oData.results.length > 0) {
                        this._sCustomerId = oData.results[0].ID;
                        this._loadAllData();
                    } else {
                        this._sCustomerId = null;
                        this._resetAllData();
                        MessageToast.show("Customer not found.");
                    }
                }.bind(this),
                error: function () {
                    this._sCustomerId = null;
                    MessageBox.error("Error while searching customer.");
                }.bind(this)
            });
        },

    

        _resetAllData: function () {
            this._fMaxAllowedAssign = 0;
            this.getView().setModel(new JSONModel({ nodes: [] }), "treeModel");
            this.getView().setModel(new JSONModel({ items: [] }), "giftModel");
            this.byId("txtTotalReturnValue").setText("0");
            this.byId("txtTotalAssignValue").setText("0");
            this.byId("inputEmployee").setValue("");
            this.byId("txtMall").setText("");
        },


        _loadAllData: function () {
            this._loadAssignedVouchers();
            this._loadGiftVouchers();
        },


        _loadAssignedVouchers: function () {
            var oModel = this.getView().getModel();
            oModel.read("/GVHeaderSet", {
                filters: [
                    new Filter("customer_ID",   FilterOperator.EQ, this._sCustomerId),
                    new Filter("gvr_type_code", FilterOperator.EQ, "CI")
                ],
                urlParameters: {
                    "$expand": "assignGiftVouchers($expand=giftVoucher),campaign,customer"
                },
                success: function (oData) {
                    var aResults = oData.results || [];
                    if (aResults.length === 0) {
                        MessageToast.show("No assigned vouchers found for this customer.");
                        this._resetAllData();
                        return;
                    }

                    // Set header info from first record
                    var oFirst = aResults[0];
                    this.byId("txtMall").setText(String(oFirst.shoppingMall_plant_code || ""));
                    this.byId("inputEmployee").setValue(String(oFirst.employee_code || ""));

                    // Build tree
                    var aTreeNodes = this._buildTreeNodes(aResults);
                    var oTreeModel = new JSONModel({ nodes: aTreeNodes });
                    this.getView().setModel(oTreeModel, "treeModel");

                    var oTreeTable = this.byId("assignedGiftsTree");
                    oTreeTable.bindRows({
                        path:       "treeModel>/nodes",
                        parameters: { arrayNames: ["nodes"] }
                    });
                    oTreeTable.expandToLevel(1);

                    // Recalculate totals (return qty starts at 0)
                    this._recalculateReturnTotal();
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading GVHeaderSet:", oErr);
                    MessageBox.error("Failed to load assigned vouchers.");
                }
            });
        },

    

        _loadGiftVouchers: function () {
            var oModel = this.getView().getModel();
            oModel.read("/GiftVoucherSet", {
                filters: [
                    new Filter("shoppingMall_plant_code", FilterOperator.EQ, 8208)
                ],
                success: function (oData) {
                    var aResults = oData.results || [];
                    var aItems   = aResults.map(function (oGV) {
                        // GF type = editable issue qty, GV type = read-only (dashed style)
                        var bEditable = (oGV.type_code === "GF");
                        return {
                            ID:            oGV.ID,
                            material:      oGV.material  || "",
                            descr:         oGV.descr     || "",
                            stock:         String(oGV.stock || 0),
                            price:         oGV.price     || "0.00",
                            issue_quantity: bEditable ? "1" : "1",
                            coupon:        oGV.coupon    || "",
                            brand:         oGV.brand     || "",
                            expiryDate:    this._formatODataDate(oGV.expDate),
                            type_code:     oGV.type_code || "",
                            isEditable:    bEditable
                        };
                    }.bind(this));

                    this.getView().setModel(new JSONModel({ items: aItems }), "giftModel");
                    // Keep original list for search reset
                    this._aAllGiftItems = aItems;
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading GiftVoucherSet:", oErr);
                    MessageBox.error("Failed to load gift items.");
                }
            });
        },


        _buildTreeNodes: function (aResults) {
            return aResults.map(function (oHeader) {
                var aAssigned = (oHeader.assignGiftVouchers && oHeader.assignGiftVouchers.results) || [];

                var aChildren = aAssigned.map(function (oAssign, iIdx) {
                    var oGV = oAssign.giftVoucher || {};
                    return {
                        gvr_no:          String(iIdx + 1),
                        campaign:        "",
                        issueDate:       "",
                        coupon:          oGV.coupon   || "",
                        material:        oGV.material || "",
                        descr:           oGV.descr    || "",
                        brand:           oGV.brand    || "",
                        price:           oGV.price    || "0.00",
                        issue_quantity:  String(oAssign.issue_quantity || 0),
                        return_quantity: "0",
                        expiryDate:      this._formatODataDate(oGV.expDate),
                        totalAmount:     oAssign.total_amount || "0.00",
                        isLeaf:          true,
                        assignId:        oAssign.ID,
                        giftVoucherId:   oGV.ID || "",
                        headerId:        oHeader.ID,
                        nodes:           []
                    };
                }.bind(this));

                return {
                    gvr_no:          oHeader.gv_no || "",
                    campaign:        oHeader.campaign_name || "",
                    issueDate:       this._formatODataDate(oHeader.createdAt),
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

     

        onCollapseAll: function () {
            this.byId("assignedGiftsTree").collapseAll();
        },
        onCollapseSelection: function () {
            var oTable = this.byId("assignedGiftsTree");
            oTable.getSelectedIndices().forEach(function (i) { oTable.collapse(i); });
        },
        onExpandFirstLevel: function () {
            this.byId("assignedGiftsTree").expandToLevel(1);
        },
        onExpandSelection: function () {
            var oTable = this.byId("assignedGiftsTree");
            oTable.getSelectedIndices().forEach(function (i) { oTable.expand(i); });
        },
        onRowSelectionChange: function () { /* reserved */ },


        onReturnQtyChange: function (oEvent) {
            var oInput   = oEvent.getSource();
            var oContext = oInput.getBindingContext("treeModel");
            if (!oContext) { return; }

            var iEntered  = parseInt(oInput.getValue(), 10) || 0;
            var iIssueQty = parseInt(oContext.getProperty("issue_quantity"), 10) || 0;

            if (iEntered < 0) { iEntered = 0; }
            if (iEntered > iIssueQty) {
                MessageToast.show("Return quantity cannot exceed issue quantity (" + iIssueQty + ").");
                iEntered = iIssueQty;
            }

            oInput.setValue(String(iEntered));
            oContext.getModel().setProperty(
                oContext.getPath() + "/return_quantity", String(iEntered)
            );

            this._recalculateReturnTotal();
        
            this._recalculateAssignTotal();
        },


        _recalculateReturnTotal: function () {
            var oTreeModel = this.getView().getModel("treeModel");
            if (!oTreeModel) { return; }
            var aNodes = oTreeModel.getProperty("/nodes") || [];
            var fTotal = 0;

            aNodes.forEach(function (oParent) {
                (oParent.nodes || []).forEach(function (oChild) {
                    var iQty   = parseInt(oChild.return_quantity, 10) || 0;
                    var fPrice = parseFloat(oChild.price) || 0;
                    fTotal += iQty * fPrice;
                });
            });

            this._fMaxAllowedAssign = fTotal; // budget for assign table
            this.byId("txtTotalReturnValue").setText(fTotal.toFixed(2));
            return fTotal;
        },


        onGiftSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oGiftModel = this.getView().getModel("giftModel");
            if (!oGiftModel) { return; }

            if (!sQuery) {
                oGiftModel.setProperty("/items", this._aAllGiftItems || []);
                return;
            }
            var sLower   = sQuery.toLowerCase();
            var aFiltered = (this._aAllGiftItems || []).filter(function (oItem) {
                return (oItem.material && oItem.material.toLowerCase().includes(sLower)) ||
                       (oItem.descr    && oItem.descr.toLowerCase().includes(sLower))    ||
                       (oItem.coupon   && oItem.coupon.toLowerCase().includes(sLower))   ||
                       (oItem.brand    && oItem.brand.toLowerCase().includes(sLower));
            });
            oGiftModel.setProperty("/items", aFiltered);
        },

        onGiftRowSelectionChange: function () {
            this._recalculateAssignTotal();
        },

  

        onIssueQtyChange: function (oEvent) {
            var oInput   = oEvent.getSource();
            var oContext = oInput.getBindingContext("giftModel");
            if (!oContext) { return; }

            var iEntered = parseInt(oInput.getValue(), 10) || 0;
            var iStock   = parseInt(oContext.getProperty("stock"), 10) || 0;

            if (iEntered < 0) { iEntered = 0; }
            if (iEntered > iStock) {
                MessageToast.show("Issue quantity cannot exceed stock (" + iStock + ").");
                iEntered = iStock;
            }

            oInput.setValue(String(iEntered));
            oContext.getModel().setProperty(
                oContext.getPath() + "/issue_quantity", String(iEntered)
            );

            this._recalculateAssignTotal();
        },



        _recalculateAssignTotal: function () {
            var oTable         = this.byId("giftItemsTable");
            var oGiftModel     = this.getView().getModel("giftModel");
            if (!oTable || !oGiftModel) { return 0; }

            var aSelectedIdx   = oTable.getSelectedIndices();
            var aItems         = oGiftModel.getProperty("/items") || [];
            var fAssignTotal   = 0;

            aSelectedIdx.forEach(function (iIdx) {
                var oItem  = aItems[iIdx];
                if (oItem) {
                    var iQty   = parseInt(oItem.issue_quantity, 10) || 0;
                    var fPrice = parseFloat(oItem.price) || 0;
                    fAssignTotal += iQty * fPrice;
                }
            });

            this.byId("txtTotalAssignValue").setText(fAssignTotal.toFixed(2));
            return fAssignTotal;
        },

   
  onSubmit: function () {
    var sMobile  = this.byId("mobileInput").getValue();
    var sComment = this.byId("inputComments").getValue();

    if (!sMobile) {
        MessageToast.show("Please enter or select a customer mobile.");
        return;
    }
    if (!this._sCustomerId) {
        MessageToast.show("Customer not found. Please select a valid customer.");
        return;
    }

    // ── 1. Build return vouchers ──────────────────────────────────────
    var oTreeModel      = this.getView().getModel("treeModel");
    var aNodes          = oTreeModel ? (oTreeModel.getProperty("/nodes") || []) : [];
    var aReturnVouchers = [];
    var fReturnTotal    = 0;

    aNodes.forEach(function (oParent) {
        var sHeaderId = oParent.headerId;
        (oParent.nodes || []).forEach(function (oChild) {
            var iQty = parseInt(oChild.return_quantity, 10) || 0;
            if (iQty > 0) {
                var fPrice  = parseFloat(oChild.price) || 0;
                var fAmount = iQty * fPrice;
                fReturnTotal += fAmount;
                aReturnVouchers.push({
                    giftVoucher_ID:        oChild.giftVoucherId,
                    total_amount:          fAmount,
                    issue_quantity:        iQty,
                    returnedGVHeader_ID:   sHeaderId,
                    RT_Ass_GiftVoucher_ID: oChild.assignId
                });
            }
        });
    });

    if (aReturnVouchers.length === 0) {
        MessageToast.show("Please enter a return quantity for at least one item in 'Gifts Assigned to Customer'.");
        return;
    }

    // ── 2. Build assign (replacement) vouchers ────────────────────────
    var oTable       = this.byId("giftItemsTable");
    var oGiftModel   = this.getView().getModel("giftModel");
    var aSelectedIdx = oTable.getSelectedIndices();
    var aItems       = oGiftModel ? (oGiftModel.getProperty("/items") || []) : [];

    if (aSelectedIdx.length === 0) {
        MessageToast.show("Please select at least one replacement gift item.");
        return;
    }

    var aAssignVouchers = [];
    var fAssignTotal    = 0;

    // ── 3. Per-item qty + stock validation, accumulate total ──────────
    for (var i = 0; i < aSelectedIdx.length; i++) {
        var oRowContext = oTable.getContextByIndex(aSelectedIdx[i]);
        if (!oRowContext) { continue; }

        var oItem  = oRowContext.getObject();
        var iQty   = parseInt(oItem.issue_quantity, 10) || 0;
        var iStock = parseInt(oItem.stock, 10) || 0;

        if (iQty < 1) {
            MessageToast.show(
                "Issue quantity for '" + (oItem.descr || oItem.material) +
                "' must be at least 1."
            );
            return;
        }
        if (iQty > iStock) {
            MessageToast.show(
                "'" + (oItem.descr || oItem.material) +
                "' only has " + iStock + " in stock. Please reduce the quantity."
            );
            return;
        }

        var fPrice = parseFloat(oItem.price) || 0;
        var fAmt   = iQty * fPrice;
        fAssignTotal += fAmt;

        aAssignVouchers.push({
            giftVoucher_ID: oItem.ID,
            total_amount:   fAmt,
            issue_quantity: iQty
        });
    }

    // ── 4. Return value must be >= replacement value (backend rule) ───
    // e.g. return ₹7000 iPhone → can replace with up to ₹7000 worth
    // e.g. return ₹1000 voucher → cannot replace with ₹7000 iPhone
    if (fReturnTotal < fAssignTotal) {
        MessageBox.warning(
            "Replacement total (\u20B9" + fAssignTotal.toFixed(2) +
            ") cannot exceed the return total (\u20B9" + fReturnTotal.toFixed(2) +
            ").\n\nPlease select replacement items within the returned value."
        );
        return;
    }

    // ── 5. Build payload ──────────────────────────────────────────────
    var oPayload = {
        gvr_type_code:           "RP",
        shoppingMall_plant_code: 8208,
        customer_ID:             this._sCustomerId,
        employee_code:           102312,
        assignGiftsTotal_amt:    fAssignTotal,
        returnGiftsTotal_amt:    fReturnTotal,
        comment:                 sComment,
        assignGiftVouchers:      aAssignVouchers,
        returnGiftVouchers:      aReturnVouchers
    };

    console.log("Replacement payload:", JSON.stringify(oPayload, null, 2));


    var oDataModel = this.getView().getModel();
    oDataModel.create("/GVHeaderSet", oPayload, {
        success: function (oData) {
            console.log("Replacement submitted:", oData);
            var sNewGVR = oData.gv_no || "";
            MessageToast.show(
                "Replacement submitted successfully!" +
                (sNewGVR ? " New GVR: " + sNewGVR : "")
            );
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        }.bind(this),
        error: function (oErr) {
            console.error("Replacement submit failed:", oErr);
            var sMsg = "Submit failed. Please try again.";
            try {
                var oErrBody = JSON.parse(oErr.responseText);
                if (oErrBody && oErrBody.error && oErrBody.error.message) {
                    sMsg = oErrBody.error.message.value || sMsg;
                }
            } catch (e) { /* ignore */ }
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