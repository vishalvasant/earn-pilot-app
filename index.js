import { AppRegistry } from 'react-native';
import App from './App';

// Get app name from app.json
const appConfig = require('./app.json');
const appName = appConfig.name || 'earn-pilot-mobile';

AppRegistry.registerComponent(appName, () => App);
