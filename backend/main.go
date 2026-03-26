package main

import (
	"backend/websocket"
	"embed"
	"io/fs"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

//go:embed all:dist
var frontendFS embed.FS

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// WebSocket endpoint
	e.GET("/ws", func(c echo.Context) error {
		websocket.HandleTerminal(c.Response(), c.Request())
		return nil
	})

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.String(200, "OK")
	})

	// Serve embedded frontend (will work after frontend build)
	distFS, err := fs.Sub(frontendFS, "dist")
	if err == nil {
		e.GET("/*", echo.WrapHandler(http.FileServer(http.FS(distFS))))
	} else {
		// Fallback for development
		e.GET("/", func(c echo.Context) error {
			return c.String(200, "Web SSH Server - Frontend not built yet")
		})
	}

	e.Logger.Fatal(e.Start(":8080"))
}
