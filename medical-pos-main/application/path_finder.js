const path = require('path');

// get the path for frontend/build
const frontendBuildPath = path.join(__dirname, './frontend/build');

// get the path for frontend/public
const frontendPublicPath = path.join(__dirname, './frontend/public');

// print the paths so we can know they are correct
console.log('frontendBuildPath:', frontendBuildPath);
console.log('frontendPublicPath:', frontendPublicPath);
