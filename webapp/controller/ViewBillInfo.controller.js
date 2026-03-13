sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageBox, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("gvtracker.controller.ViewBillInfo", {

        onInit: function () {
     
            var oLocalModel = new JSONModel({ bills: { results: [] } });
            this.getView().setModel(oLocalModel, "bill");

            this.getOwnerComponent().getRouter()
                .getRoute("RouteViewBillInfoScreen")
                .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sGVRId = oEvent.getParameter("arguments").custID;
            console.log("Bill Info Screen - GVR ID:", sGVRId);
            this._loadBillInfo(sGVRId);
        },

        _loadBillInfo: function (sGVRId) {
            var oModel      = this.getView().getModel();
            var oLocalModel = this.getView().getModel("bill");
            var sPath       = "/GVHeaderSet(guid'" + sGVRId + "')";

            oModel.read(sPath, {
                urlParameters: {
                    "$expand": "customer,bills/attachment"
                },
                success: function (oData) {
                  
                    var aBills = oData.bills ? oData.bills.results || [] : [];
                    var fTotal = aBills.reduce(function (sum, oBill) {
                        return sum + parseFloat(oBill.b_amount || 0);
                    }, 0);

                
                    this.byId("inputGVRNo").setValue(oData.gv_no || "");
                    this.byId("inputTotalBill").setValue(fTotal.toFixed(2));
                    oLocalModel.setData({ bills: oData.bills });
console.log("model data:", JSON.stringify(oLocalModel.getData()));

            
                    oLocalModel.setData({ bills: oData.bills });

                    console.log("gv_no:", oData.gv_no);
                    console.log("totalBill:", fTotal.toFixed(2));
                    console.log("bills:", aBills);
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading bill info:", oErr);
                    MessageBox.error("Error loading bill information.");
                }
            });
        },

        // onDownloadAttachment: function (oEvent) {
        //     var oContext  = oEvent.getSource().getBindingContext("bill");
        //     var oData     = oContext.getObject();
        //     var sMediaSrc = oData.attachment && oData.attachment.__metadata
        //                   ? oData.attachment.__metadata.media_src : "";

        //     if (sMediaSrc) {
        //         sap.m.URLHelper.redirect(sMediaSrc, true);
        //     } else {
        //         MessageToast.show("No attachment available.");
        //     }
        // },

        // onEmailAttachment: function (oEvent) {
        //     var oContext  = oEvent.getSource().getBindingContext("bill");
        //     var oData     = oContext.getObject();
        //     var sFileName = oData.attachment ? oData.attachment.fileName : "";
        //     var sMediaSrc = oData.attachment && oData.attachment.__metadata
        //                   ? oData.attachment.__metadata.media_src : "";

        //     sap.m.URLHelper.triggerEmail(
        //         "",
        //         "Bill Attachment: " + sFileName,
        //         "Please find the bill attachment: " + sMediaSrc
        //     );
        // },

        onBack: function () {
            history.go(-1);
        },

        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        }

    });
});