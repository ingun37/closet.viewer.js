#!/usr/bin/env zsh

if [ -x "$(command -v nix-shell)" ]
then
  echo 'Nix exists. Entering nix-shell...'
  nix-shell -p chromedriver --run 'npm t -- -t graphic'
  exit
elif [ -x "$(command -v chromedriver)" ]
then
  echo 'Nix does not exists but chromedriver exists. Running the test...'
  npm t -- -t graphic
else
  echo 'Neither Nix nor chromedriver exists. Please install either of them and try again.'
fi