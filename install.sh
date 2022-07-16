#!/bin/bash

git clone https://github.com/zckevin/jpeg-data-channel.git
git submodule update --init --recursive
npm install -g pnpm
pnpm install
