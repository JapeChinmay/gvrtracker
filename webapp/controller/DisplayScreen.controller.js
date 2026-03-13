sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    var FULL_EXPAND = "customer,bills/attachment,assignGiftVouchers/giftVoucher,campaign,returnGiftVouchers/giftVoucher,returnGiftVouchers/returnedGVHeader";

    return Controller.extend("gvtracker.controller.DisplayScreen", {

        onInit: function () {
            var oRoute = this.getOwnerComponent().getRouter();
            oRoute.getRoute("RouteDisplayScreen")
                  .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sGVR = oEvent.getParameter("arguments").gvr;
            console.log("Display Screen - GVR:", sGVR);
            this._sGVR = sGVR;

            if (sGVR) {
                this._loadAndSelectGVR(sGVR);
            }
        },

        _loadAndSelectGVR: function (sGVR) {
            var oModel = this.getView().getModel();

            oModel.read("/GVHeaderSet", {
                filters: [
                    new Filter("gv_no", FilterOperator.EQ, sGVR)
                ],
                urlParameters: {
                    "$expand": FULL_EXPAND
                },
                success: function (oData) {
                    console.log(oData);
                    if (oData.results.length > 0) {
                        var sPath = "/GVHeaderSet(guid'" + oData.results[0].ID + "')";
                        var oContext = oModel.getContext(sPath);
                        this._setDetailContext(oContext);
                    } else {
                        MessageToast.show("GVR Number not found: " + sGVR);
                    }
                }.bind(this),
                error: function (oErr) {
                    console.error("Error loading GVR:", oErr);
                    MessageBox.error("Error loading GVR details.");
                }
            });
        },


        onGVRItemSelect: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext();
            var sPath    = oContext.getPath();
            var oModel   = this.getView().getModel();
            var oView    = this.getView();

   
            this._setDetailFields(oContext);

         
            oModel.read(sPath, {
                urlParameters: {
                    "$expand": FULL_EXPAND
                },
                success: function (oData) {
                    console.log(oData);
                 
                    oView.byId("giftItemsTable").setBindingContext(oContext);
                },
                error: function (oErr) {
                    console.error("Error loading GVR details:", oErr);
                }
            });
        },

    
        _setDetailFields: function (oContext) {
            var oView = this.getView();
            oView.byId("detailGVRNo").setBindingContext(oContext);
            oView.byId("detailTotalValue").setBindingContext(oContext);
            oView.byId("detailCustType").setBindingContext(oContext);
            oView.byId("detailCustMobile").setBindingContext(oContext);
            oView.byId("detailCampaign").setBindingContext(oContext);
            oView.byId("detailGVRDate").setBindingContext(oContext);
            oView.byId("detailEmployee").setBindingContext(oContext);
            oView.byId("detailMall").setBindingContext(oContext);
            oView.byId("detailComments").setBindingContext(oContext);
        },

        _setDetailContext: function (oContext) {
            this._setDetailFields(oContext);
            this.getView().byId("giftItemsTable").setBindingContext(oContext);
             this.getView().byId("returnGiftItemsTable").setBindingContext(oContext);
        },

        onGVRListSearch: function (oEvent) {
            var sQuery   = oEvent.getParameter("query") ||
                           oEvent.getParameter("newValue") || "";
            var oList    = this.byId("gvrList");
            var oBinding = oList.getBinding("items");
            var aFilters = [];

            if (sQuery) {
                aFilters.push(new Filter("gv_no", FilterOperator.Contains, sQuery));
            }

            oBinding.filter(aFilters);
        },

        onViewBillInfo: function () {
            var sGVRNo = this.byId("detailGVRNo").getText();
            if (!sGVRNo) {
                MessageToast.show("Please select a GVR first.");
                return;
            }

            var oModel = this.getView().getModel();
            oModel.read("/GVHeaderSet", {
                filters: [
                    new Filter("gv_no", FilterOperator.EQ, sGVRNo)
                ],
                urlParameters: {
                    "$expand": "bills/attachment"
                },
                success: function (oData) {
                    console.log("Bill Info:", oData.results);
                    MessageToast.show("Bills loaded. Check console.");
                }.bind(this),
                error: function (oErr) {
                    console.error("Bill info error:", oErr);
                }
            });
        },

      onDisplayModeSelect: function (oEvent) {
    var iIndex = oEvent.getSource().getSelectedIndex();
    var oView  = this.getView();

    if (iIndex === 0) {
       
        oView.byId("giftItemsTable").setVisible(true);
        oView.byId("giftTableTitle").setText("Gift Items list issued to Customer");
        oView.byId("returnGiftItemsTable").setVisible(false);
        oView.byId("returnGiftTableTitle").setVisible(false);

    } else if (iIndex === 1) {
     
        oView.byId("giftItemsTable").setVisible(false);
        oView.byId("giftTableTitle").setText("");
        oView.byId("returnGiftItemsTable").setVisible(true);
        oView.byId("returnGiftTableTitle").setVisible(true);

    } else if (iIndex === 2) {
       
        oView.byId("giftItemsTable").setVisible(true);
        oView.byId("giftTableTitle").setText("Replacement Gift Items");
        oView.byId("returnGiftItemsTable").setVisible(false);
        oView.byId("returnGiftTableTitle").setVisible(false);
    }
},

        onHome: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHomeScreen");
        },

          onViewBillInfo:function() {

                var oContext =  this.byId("detailGVRNo").getBindingContext();
                if(!oContext) { MessageBox.Show('Please Select the GVR No');
                    return;


                }
  
                  var GVRID= this.byId("detailGVRNo").getBindingContext().getObject().ID;



             
               var route = this.getOwnerComponent().getRouter();
               route.navTo('RouteViewBillInfoScreen', {
                  custID:GVRID
               });

          }

    });
});