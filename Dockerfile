# Ubuntu 22.04를 기본 이미지로 사용
FROM ubuntu:22.04

# 시스템 패키지 업데이트 및 필요한 도구 설치
RUN apt-get update && apt-get install -y \
    wget \
    git \
    make \
    && rm -rf /var/lib/apt/lists/*

# Go 설치 (Go 1.23.1 버전)
ENV GO_VERSION=1.23.1
RUN wget https://golang.org/dl/go${GO_VERSION}.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz \
    && rm go${GO_VERSION}.linux-amd64.tar.gz

# Go 환경 변수 설정
ENV PATH=$PATH:/usr/local/go/bin
ENV GOPATH=/go
ENV PATH=$PATH:$GOPATH/bin

# 작업 디렉토리 설정
WORKDIR /app

# 기본 명령을 bash로 설정
CMD ["/bin/bash"]