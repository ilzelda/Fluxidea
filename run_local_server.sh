#!/bin/sh

mkdir -p backend/static/
cp frontend/* backend/static/

make -C backend run