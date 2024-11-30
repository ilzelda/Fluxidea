#!/bin/sh

mkdir -p backend/static/
cp frontend/* backend/static/

cd backend && make run