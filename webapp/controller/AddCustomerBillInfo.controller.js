sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, Fragment, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("gvtracker.controller.AddCustomerBillInfo", {

        onInit: function () {
            this._iCurrentCameraRowIndex = null;

            var oModel = new JSONModel({ bills: [] });
            this.getView().setModel(oModel, "billModel");

            var oRoute = this.getOwnerComponent().getRouter();
            oRoute.getRoute('RouteAddBillInfo').attachPatternMatched(this._routeMatched, this);
        },

        _routeMatched: function (oEvent) {
            var mobile = oEvent.getParameter('arguments').mobile;
            this.getView().byId('mobileInputCustomerBillInfo').setValue(mobile);
            this.getView().getModel("billModel").setProperty("/bills", []);
            this.getView().byId("totalBillValue").setValue("0");
        },

 
        onAddBillRow: function () {
            var oModel = this.getView().getModel("billModel");
            var aBills = oModel.getProperty("/bills");

            aBills.push({
                srNo        : aBills.length + 1,
                billNo      : "",
                billValue   : "",
                fileName    : "",
                fileBase64  : "",
                fileMimeType: "",
                photo       : "",
                photoVisible: false
            });

            oModel.setProperty("/bills", aBills);
        },

 
        onDeleteBillRow: function () {
            var oTable    = this.getView().byId("billTable");
            var aSelected = oTable.getSelectedItems();

            if (aSelected.length === 0) {
                MessageToast.show("Select at least one row to delete.");
                return;
            }

            MessageBox.confirm("Delete " + aSelected.length + " selected row(s)?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oModel = this.getView().getModel("billModel");
                        var aBills = oModel.getProperty("/bills");

                        var aIndicesToRemove = aSelected.map(function (oItem) {
                            return oTable.indexOfItem(oItem);
                        });

                        aIndicesToRemove.sort(function (a, b) { return b - a; });
                        aIndicesToRemove.forEach(function (iIndex) {
                            aBills.splice(iIndex, 1);
                        });

                        aBills.forEach(function (oBill, idx) {
                            oBill.srNo = idx + 1;
                        });

                        oModel.setProperty("/bills", aBills);
                        this._recalculateTotal();
                        MessageToast.show("Row(s) deleted.");
                    }
                }.bind(this)
            });
        },

        onBillValueChange: function () {
            this._recalculateTotal();
        },

        _recalculateTotal: function () {
            var aBills = this.getView().getModel("billModel").getProperty("/bills");
            var fTotal = 0;
            aBills.forEach(function (oBill) {
                var fVal = parseFloat(oBill.billValue);
                if (!isNaN(fVal)) { fTotal += fVal; }
            });
            this.getView().byId("totalBillValue").setValue(fTotal.toFixed(2));
        },

        onFileChange: function (oEvent) {
            var oFile  = oEvent.getParameter("files")[0];
            if (!oFile) {
                
                return; 
            
            }

            var sPath  = oEvent.getSource().getBindingContext("billModel").getPath();
            var iIndex = parseInt(sPath.split("/").pop());

            var oReader = new FileReader();
            oReader.onload = function (e) {
                var oModel = this.getView().getModel("billModel");
                oModel.setProperty("/bills/" + iIndex + "/fileName",     oFile.name);
                oModel.setProperty("/bills/" + iIndex + "/fileBase64",   e.target.result.split(",")[1]);
                oModel.setProperty("/bills/" + iIndex + "/fileMimeType", oFile.type);
            }.bind(this);
            oReader.readAsDataURL(oFile);
        },

   
        onOpenCamera: function (oEvent) {
            var sPath = oEvent.getSource().getBindingContext("billModel").getPath();
            this._iCurrentCameraRowIndex = parseInt(sPath.split("/").pop());

            var oView = this.getView();
            if (!this._cameraDialog) {
                Fragment.load({
                    id        : oView.getId(),
                    name      : "gvtracker.fragments.Camera",
                    controller: this
                }).then(function (oDialog) {
                    this._cameraDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                    this._startCamera();
                }.bind(this));
            } else {
                this._cameraDialog.open();
                this._startCamera();
            }
        },


        _startCamera: function () {
            this._cameraDialog.attachEventOnce("afterOpen", function () {
                var video = document.getElementById("cameraVideo");
                if (!video) { return; }
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then(function (stream) {
                        video.srcObject = stream;
                        video.play();
                    })
                    .catch(function (err) {
                        MessageToast.show("Camera denied: " + err.message);
                    });
            });
        },

        onCapturePhoto: function () {
            var video = document.getElementById("cameraVideo");
            if (!video || !video.srcObject) {
                MessageToast.show("Camera not ready.");
                return;
            }

            var canvas = document.createElement("canvas");
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext("2d").drawImage(video, 0, 0);

            var sDataUrl = canvas.toDataURL("image/jpeg", 0.8);
            var iIndex   = this._iCurrentCameraRowIndex;
            var oModel   = this.getView().getModel("billModel");

            oModel.setProperty("/bills/" + iIndex + "/photo",        sDataUrl);
            oModel.setProperty("/bills/" + iIndex + "/photoVisible",  true);
            oModel.setProperty("/bills/" + iIndex + "/fileName",      "photo_" + (iIndex + 1) + ".jpg");
            oModel.setProperty("/bills/" + iIndex + "/fileBase64",    sDataUrl.split(",")[1]);
            oModel.setProperty("/bills/" + iIndex + "/fileMimeType",  "image/jpeg");

            this._stopCamera();
            this._cameraDialog.close();
            MessageToast.show("Photo captured!");
        },

      
        onCloseCamera: function () {
            this._stopCamera();
            if (this._cameraDialog) { 
                
                
                { this._cameraDialog.close(); }}
        },

    
        _stopCamera: function () {
            var video = document.getElementById("cameraVideo");
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(function (t) { t.stop(); });
                video.srcObject = null;
            }
        },

        onNext: function () {
            var aBills = this.getView().getModel("billModel").getProperty("/bills");

            if (!aBills || !Array.isArray(aBills) || aBills.length === 0) {
                MessageToast.show("Add at least one bill.");
                return;
            }

            for (var i = 0; i < aBills.length; i++) {
                if (!aBills[i].billNo || !aBills[i].billValue) {
                    MessageToast.show("Row " + aBills[i].srNo + ": Bill No and Bill Value required.");
                    return;
                }
                if (!aBills[i].fileBase64) {
                    MessageToast.show("Row " + aBills[i].srNo + ": Upload a file or capture a photo.");
                    return;
                }
            }

            this._uploadAllAttachments(aBills);
        },

        _uploadAllAttachments: function (aBills) {
            var oDataModel = this.getOwnerComponent().getModel();
            console.log("bills", aBills);

            var aPromises = aBills.map(function (oBill) {
                return new Promise(function (resolve, reject) {

                    var oPayload = {
                        fileName   : oBill.fileName,
                        contentType: oBill.fileMimeType,
                        content    : oBill.fileBase64
                    };

                    oDataModel.create("/AttachmentSet", oPayload, {
                        success: function (oData) {
                            console.log(oData);
                            console.log(oData.ID);
                            resolve({
                                b_no         : oBill.billNo,
                                sr_no        : oBill.srNo,
                                b_amount     : parseFloat(oBill.billValue),
                                attachment_ID: oData.ID
                            });
                        },
                        error: function (oErr) {
                            reject("Row " + oBill.srNo + " upload failed.");
                        }
                    });
                });
            });

            Promise.all(aPromises)
                .then(function (aBillsPayload) {
                    var oAppModel = this.getOwnerComponent().getModel("appModel");
                    if (!oAppModel) {
                        oAppModel = new JSONModel({});
                        this.getOwnerComponent().setModel(oAppModel, "appModel");
                    }
                    oAppModel.setProperty("/billsPayload", aBillsPayload);
                    MessageToast.show("Files uploaded! Proceeding...");
                   this.getOwnerComponent().getRouter().navTo("RouteCreateScreen");
                }.bind(this))
                .catch(function (sErr) {
                    MessageBox.error("Upload failed: " + sErr);
                });
        }
    });
});