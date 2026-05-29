#!/bin/bash
cd /Users/Design/Desktop/Brams || exit 1
export PATH="/Users/Design/.nvm/versions/node/v24.16.0/bin:$PATH"
exec npm run dev
