

sap.ui.define([
      "sap/ui/core/mvc/Controller"
], function (Controller) {
      "use strict";

      return Controller.extend("gvtracker.controller.AddCustomerProfile", {


            onInit: function () {

                  var oCustomer = {
                        phone: "",
                        phoneCode_code: "",
                        salutation_code: "",
                        name: "",
                        email: ""
                  };



                  var oModel = new sap.ui.model.json.JSONModel(oCustomer);

                  this.getView().setModel(oModel, "customer");




                  var oRoute = this.getOwnerComponent().getRouter();
                  oRoute.getRoute('RouteAddCustomer').attachPatternMatched(this._onRouteMatched, this);

            },

            _onRouteMatched: function () {

                  console.log("adding customer screeen loaded");

            },


            onAddCustomer: function () {

                  var oData = this.getView().getModel('customer').getData();
                  var phoneRegex = /^[0-9]{10}$/;
                  var emailRegex = /^((?!\.)[\w\-_.]*[^.])(@\w+)(\.\w+(\.\w+)?[^.\W])$/gm

                  if (!phoneRegex.test(oData.phone)) {
                        sap.m.MessageToast.show("Enter valid phone number");
                        return;

                  }

                  if (oData.email && !emailRegex.test(oData.email)) {
                        sap.m.MessageToast.show("Enter valid Email");
                        return;

                  }

                  var payload = {

                        phone: oData.phone,
                        phoneCode_code: oData.phoneCode_code,
                        salutation_code: oData.salutation_code,
                        name: oData.name,
                        email: oData.email,
                        shoppingMall_plant_code: 8208
                  }

                  console.log(payload);


                  var oDataModel  = this.getOwnerComponent().getModel();


                  oDataModel.create("/CustomerSet", payload , {

                         success:function() {
                                sap.m.MessageToast.show("Customer Added successfully");

                         },

                         error:function(err) {
                                console.log(err);
                                sap.m.MessageBox.Error("Error while adding customer");

                         }

                  })

            }


      });
});