sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, Fragment, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("gvtracker.controller.HomeScreen", {

        onInit: function () {
            var oModel = this.getOwnerComponent().getModel();
            oModel.read("/CustomerSet", {
                success: function (data) { console.log("Customers:", data); },
                error: function (err) { console.log(err); }
            });


            this.byId("GVRInput").setEnabled(false);
        },

        onModeSelect: function (oEvent) {
            var iSelectedIndex = oEvent.getSource().getSelectedIndex();
            var oGVRInput = this.byId("GVRInput");

             if (iSelectedIndex === 0) {
                oGVRInput.setEnabled(false);
                oGVRInput.setValue("");
                oGVRInput.setPlaceholder("Not required for CREATE");
             } else {
                oGVRInput.setEnabled(true);
                oGVRInput.setPlaceholder("Enter GVR Number");
            }
        },

        routeToCreateScreen: function () {
            this.getOwnerComponent().getRouter().navTo("RouteCreateScreen");
        },


        OnExecute: function () {
            var iMode = this.byId("modeSelect").getSelectedIndex();
            var sGVR = this.byId("GVRInput").getValue();

            if (iMode === 0) {
                this.routeToCreateScreen();
            }    
            
            else if (iMode === 2) {
                    this.getOwnerComponent().getRouter().navTo("RouteReplacementScreen");

            }   if (iMode === 1) {
                    this.getOwnerComponent().getRouter().navTo("RouteReturnScreen");
                
                }
            
            else {
                if (!sGVR) {
                    MessageToast.show("Please enter a GVR Number.");
                    return;
                }
              else if (iMode === 3) {
                    this.getOwnerComponent().getRouter().navTo("RouteDisplayScreen", { gvr: sGVR });
                }
            }
        },

        onGVRValueHelp: function () {
            var oView = this.getView();

            if (!this._gvrValueHelpDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "gvtracker.fragments.GVRNumber",
                    controller: this
                }).then(function (oDialog) {
                    this._gvrValueHelpDialog = oDialog;
                    oView.addDependent(oDialog);
                    this._loadGVRData();
                    oDialog.open();
                }.bind(this));
            } else {
                this._loadGVRData();
                this._gvrValueHelpDialog.open();
            }
        },

        _loadGVRData: function () {
            var oModel = this.getView().getModel();

            oModel.read("/GVHeaderSet", {
                urlParameters: {
                    "$expand": "customer"
                },
                success: function (oData) {
                    console.log("GVHeaderSet loaded:", oData.results);

             
                    var oTitle = this.byId(
                        this.getView().getId() + "--gvrTableTitle"
                    );
                    if (oTitle) {
                        oTitle.setText("Items (" + oData.results.length + ")");
                    }
                }.bind(this),
                error: function (oErr) {
                    console.error("GVHeaderSet read error:", oErr);
                }
            });
        },


        onGVRSearch: function () {
            var oView = this.getView();
            var sGVRNo = oView.byId(oView.getId() + "--filterGVRNo").getValue();
            var sPhone = oView.byId(oView.getId() + "--filterPhone").getValue();
            var sGVRType = oView.byId(oView.getId() + "--filterGVRType").getValue();
            var sSearch = oView.byId(oView.getId() + "--gvrSearchField").getValue();

            var aFilters = [];

            if (sGVRNo) {
                aFilters.push(new Filter("gvr_no", FilterOperator.Contains, sGVRNo));
            }
            if (sPhone) {
                aFilters.push(new Filter("customer/phone", FilterOperator.Contains, sPhone));
            }
            if (sGVRType) {
                aFilters.push(new Filter("gvr_type_code", FilterOperator.Contains, sGVRType));
            }
            if (sSearch) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("gvr_no", FilterOperator.Contains, sSearch),
                        new Filter("gvr_type_code", FilterOperator.Contains, sSearch)
                    ],
                    and: false  
                }));
            }

            var oTable = this.byId(this.getView().getId() + "--gvrResultTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters);
        },


        onToggleFilters: function () {
            var oFilterBox = this.byId(this.getView().getId() + "--filterBox");
            var oBtn = this.byId(this.getView().getId() + "--toggleFilterBtn");
            var bVisible = oFilterBox.getVisible();

            oFilterBox.setVisible(!bVisible);
            oBtn.setText(bVisible ? "Show Filters" : "Hide Filters");
        },


        onGVRSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext();
            var sGVRNo = oContext.getProperty("gv_no");

            console.log("GVR Selected:", sGVRNo);
            console.log("GVR type    :", oContext.getProperty("gvr_type_code"));

            this.byId("GVRInput").setValue(sGVRNo);
            this._gvrValueHelpDialog.close();
        },

        onGVRCancel: function () {
            this._gvrValueHelpDialog.close();
        }
    });
});