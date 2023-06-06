#!/bin/bash

# Run npm build
cd server
npm run build
cd ..

# Move server/build folder to deploy folder
mv server/build deploy

# Move deploy/src/client folder to deploy/build folder
mv deploy/src/client deploy/build

# Remove deploy/src folder
rm -rf deploy/src

# Rename build to src
mv deploy/build deploy/src

echo "Done!"
