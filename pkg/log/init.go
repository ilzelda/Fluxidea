package log

import (
	"log"
	"os"

	"github.com/go-logr/logr"
	"github.com/go-logr/stdr"
)

var (
	Logger logr.Logger
)

func init() {
	Logger = stdr.New(log.New(os.Stdout, "", log.LstdFlags))
}
