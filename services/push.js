"use strict";
import React, {Component} from 'react';
import DeviceInfo from 'react-native-device-info';
import { AsyncStorage , PushNotificationIOS} from "react-native";
import { Toast } from 'native-base';

export default class PushService {

    constructor(){
        this.state = {
            MVApplicationUserID: "",
            divisionName: "",
            divisionId: "",
            bundleID: "com.mvtransit.oneportal.ios.amazon.d",
            AWSEnvironment: "",
            applicationVersion: 'v11.0.0' + 'sw9.0.0',
            oneMVApiUrl: "",
            registrationType: "APNS"//"FCM"
        };
        PushNotificationIOS.setApplicationIconBadgeNumber(0);
        PushNotificationIOS.addEventListener('register', this.onRegister);
        PushNotificationIOS.addEventListener("notification", this.onNotification);
    }

    init = (data) => {
        debugger;
        this.state.MVApplicationUserID = data.passengerId.toString().replace(/"/g,'');
        this.state.divisionName = data.alias.replace(/"/g,'');
        this.state.divisionId = data.division.toString().replace(/"/g,'');
        this.state.AWSEnvironment = data.env;
        this.state.oneMVApiUrl = "https://onemvapis-" + data.env.toLowerCase() +  ".mvtransit.com/api/";

        PushNotificationIOS.requestPermissions();
    }

    _checkStatus = async () => {
        try {
          let status = AsyncStorage.getItem('status');
          if (!status) {
             PushNotificationIOS.requestPermissions();
          }else{
              console.log("Push Registered Previously");
          }
         } catch (error) {
           console.dir(error);
         }
    }

    onNotification = (e) => {
        console.log("onNotification " + e);
        this.toast(JSON.stringify(e));
    }
 
    onRegister = (e) =>{
        console.log("onRegister = " + e);
        this._callUpdateRegistrationAPI(e);
    }

    _callUpdateRegistrationAPI(deviceToken) {
                var pushRequest = {
                    'MVApplicationName': this.state.bundleID,
                    'AWSEnvironment': this.state.AWSEnvironment,
                    'MVApplicationUserID': this.state.MVApplicationUserID,
                    'ChangedBy': 'SLU',
                    'DeviceHasGPS': '',
                    'DeviceHasKeyboard': '',
                    'DeviceHasPhone': '',
                    'DeviceIP': "true",//DeviceInfo.getIPAddress(),
                    'DeviceLatitude': null,
                    'DeviceLongitude': null,
                    'DeviceManufacturer': DeviceInfo.getManufacturer(),
                    'DeviceModel':  DeviceInfo.getModel(),
                    'DeviceSerialNumber':  'alldivisions' +  '.' + DeviceInfo.getUniqueID(),
                    'DeviceToken': deviceToken,
                    'DivisionID': this.state.divisionId,
                    'GPSReadDate': null,
                    'IsPushEnabledOnDevice': 'true',
                    'MVApplicationVersion': this.state.applicationVersion,
                    'PlatformNameVersion': DeviceInfo.getSystemName() + ' ' + DeviceInfo.getReadableVersion(),
                    'RegistrationType': this.state.registrationType,
                    'UniqueDeviceIdentifier':  'alldivisions' + '.' + DeviceInfo.getUniqueID(),
                    'TelephoneNumber': '',
                    'DeviceID': null//DeviceInfo.getUniqueID()
                };
                console.log('callUpdateRegistrationAPI', pushRequest);
               // this._saveAppData();
                this._registerAWSToken(pushRequest);
    }

    _registerAWSToken(data) {
       console.log("sending........." + JSON.stringify(data));
       var url = this.state.oneMVApiUrl + 'push/registration';
       console.log("url = "  + url);

       fetch(url,{
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then((response) => {
            debugger;
            console.log("---->" + JSON.stringify(response));
            response.json();
        })
        .catch((error) =>{
          console.error("---" + error);
        });
    }

    _saveAppData(){
          try {
            AsyncStorage.setItem('appData',JSON.stringify(this.state));
          } catch (error) {
            console.log("Error saving appData " + error);
          }
    }

    toast = (e) => {
        Toast.show({
          text: e,
          style: {
            top:30,
            backgroundColor: "#166bf4"
           },
          position: "Top",
          textStyle: {color:"#fff" },
          buttonTextStyle: { backgroundColor:'#1750aa', color: "#fff" },
          buttonStyle: { backgroundColor: "#1750aa" }
        });
      }

}