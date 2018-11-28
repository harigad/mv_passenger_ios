import React, {Component} from 'react';
import StaticServer from 'react-native-static-server';
import RNFS from 'react-native-fs';
import { WebView } from 'react-native';
import PushService from './services/push';
import { Root } from "native-base";
import { Toast, ActionSheet, Button, Text } from 'native-base';
import { AsyncStorage } from "react-native"


let path = RNFS.MainBundlePath + '/static/www';

let server = new StaticServer(5666, path);
server.start().then((url) => {
  console.log("Serving at URL", url);
});

export default class App extends Component {

  pushService;
  _new_env;
  _backBtnTimeOut;
  _currentAppVersion;

  constructor(props){
    super(props);
    console.disableYellowBox = true; 
    this.pushService = new PushService();
    this.state = { _showBackButton: false, defaultURL: "http://localhost:5666" };
    this._currentAppVersion = "11.91";
  }

  _sendTokenToWebView(token){
    
  }

  componentWillMount() {

  }

  componentDidMount() {

    this._retrieveData();
   
  }

  _retrieveData = async () => {
    try {
      const value = await AsyncStorage.getItem('_environment');
      this.selectEnv(value);
    }catch(e){
      console.log("Error");
      this.selectEnv(null);
    }
  }
  
  selectEnv(env){
    var BUTTONS = ["DEV","QA","STAGING"];
    var CANCEL_INDEX = 0;
    if(env){
      switch(env) {
        case "dev":
          BUTTONS = ["QA", "STAGING","CONTINUE IN " + env.toUpperCase()];CANCEL_INDEX = 2;
          break;
        case "qa":
          BUTTONS = ["DEV", "STAGING","CONTINUE IN " + env.toUpperCase()];CANCEL_INDEX = 2;
          break;
        case "staging":
          BUTTONS = ["DEV", "QA","CONTINUE IN " + env.toUpperCase()];CANCEL_INDEX = 2;
      }
      
    }

    let options = {
      options: BUTTONS,
      title: "VERSION : " + this._currentAppVersion
    }

    if(CANCEL_INDEX){
      options.cancelButtonIndex = CANCEL_INDEX;
    }

    ActionSheet.show(
      options,
      buttonIndex => {
         let new_env = BUTTONS[buttonIndex].toLowerCase();
         if(env !== new_env && new_env.search("continue") == -1){
            //take a backup
            let backupJs = "const items = {...localStorage};let i = {type:'save_local_storage',new_env:'"  + new_env + "',val: items};window.postMessage(JSON.stringify(i));";
            this.webview.injectJavaScript(backupJs);
            this._new_env = new_env;
       }
      }
    );
  }

  setEnvInWebView = async(data,new_env) =>{
   try{
      let old_env = data._environment;
      //save data from webView
      AsyncStorage.setItem('_' + old_env, JSON.stringify(data),(e) => {
        console.log(e);
      });
    }
   catch(e){

   }
   
    const new_env_data = await AsyncStorage.getItem('_' + new_env);
    var data_obj;
    try{
      data_obj = JSON.parse(new_env_data);
    }catch(e){

    }
    if(data_obj){
      let str = "";
      for (x in data_obj) {
        if(x !=="_environment"){
          str += "localStorage.setItem('" + x + "','" + data_obj[x] + "');";
        }
      }
    }

    let script = "localStorage.clear();localStorage.setItem('_environment','" + new_env + "');window.location='';";
    this.webview.injectJavaScript(script);
    this.toast("ENVIRONMENT SET TO " + new_env.toUpperCase());
    AsyncStorage.setItem('_environment', new_env,(e) => {
      console.log(e);
    });
    debugger;
    console.log(str);
   // this.webview.injectJavaScript(str);
  }

  log = (e) => {
    console.log(e);
    if(e.url.search("http://localhost") !== 0 && e.url.search("react-js-navigation") == -1){
      //external url 
      this._backBtnTimeOut = setTimeout(function(){
        this.setState({_showBackButton: true});
      }.bind(this),1000);
    }else{
      this.setState({_showBackButton: false});
      try{
        if(this._backBtnTimeOut){
          clearTimeout(this._backBtnTimeOut);
          this._backBtnTimeOut = null;
        }
      }catch(e){
        console.log(e);
      }
    }
     
    }
  

  toast = (e,duration = 3000) => {
    Toast.show({
      text: e,
      style: {
        top:30,
        backgroundColor: "#166bf4"
       },
      position: "Top",
      textStyle: {color:"#fff",textAlign:"center" },
      buttonTextStyle: { backgroundColor:'#1750aa', color: "#fff" },
      buttonStyle: { backgroundColor: "#1750aa" },
      duration: duration
    });
  }

onMessage = async( event ) => {
  console.log( "On Message: ", event.nativeEvent.data );
  try{
    let data = JSON.parse(event.nativeEvent.data);
    if(data){
      if(data.type == "save_local_storage"){
        this.setEnvInWebView(data.val,data.new_env);
      }else if(data.type == "register_push"){
        const value = await AsyncStorage.getItem('_environment');
        data.env = value.toUpperCase();
        this.pushService.init(data);
      }else if(data.type == "checkMinAppVersion"){
        try{
        let division = data.data;
        let minAppVersion = division.MinAppVersion;
        minAppVersion = minAppVersion.replace(/\./g,'');
        minAppVersion = minAppVersion.replace('v','');
        let currentAppVersionInt = parseInt(this._currentAppVersion.replace(/\./g,''));
        let minAppVersionInt = parseInt(minAppVersion);
          if(minAppVersionInt > currentAppVersionInt){
            console.log("OOPS! Does not meet minimum app version requirements");
            this.setState({
              defaultURL: "http://localhost:5666#/min-app-support"
            })
          }else{
            console.log(minAppVersionInt + " < " + currentAppVersionInt);
          }
        }catch(e){
          console.log(e);
        }
      }
    }
 }catch(e){
   console.log("WebView OnMessage Error: " + e);
 }
   
}


onBackButtonPressed(e) {
  console.log("onBackButtonPressed");
  this.webview.injectJavaScript("window.history.go(-1);");
}

  render() {
    return (
      <Root>
      <WebView bounces={false}  onNavigationStateChange={this.log}   ref={r => this.webview = r} 
      source={{uri: this.state.defaultURL}}  onMessage={this.onMessage} 
      style={{marginTop: 20}} 
      />
      { this.state._showBackButton && 
       <Button onPress={this.onBackButtonPressed.bind(this)}  style={{height:40, width:'100%', position:"absolute", backgroundColor:"#0c4281", borderRadius:0,  bottom:0}} >
        <Text>Back to SLU Transit</Text>
       </Button>
      }
    </Root>
    );
  }

}
