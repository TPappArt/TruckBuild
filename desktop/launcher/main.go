// Fizzbang Rally for the desktop: one program with the whole game inside it.
//
// The game is a web page. This program serves that page to this computer
// only, and opens it in a window of its own with no browser furniture round
// it, using Microsoft Edge (which every copy of Windows 10 and 11 has) or
// Google Chrome. It stops when the window is closed.
//
// Nothing is installed, downloaded or sent anywhere, and nothing can reach
// the game from another computer: it listens on 127.0.0.1 only.
//
// Build:   see scripts/build-desktop.mjs (copies the game into ./www first)
// Test:    truckbuild --selftest   (serves, fetches its own pages, exits)
package main

import (
	"embed"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

//go:embed all:www
var bundled embed.FS

// The port is fixed on purpose. A browser keeps saved games per address, and
// the port is part of the address: a different one each time would lose the
// player's coins and parts.
const address = "127.0.0.1:47615"
const home = "http://" + address + "/"

// A page that is open holds a connection to /alive. When there has been no
// such connection for this long, the window has been closed.
const closedAfter = 4 * time.Second

// Give up if no window ever turns up.
const neverOpened = 90 * time.Second

// Added to the game's page so that it holds that connection open.
const heartbeat = `<script>new EventSource("/alive");</script>`

var types = map[string]string{
	".html":        "text/html; charset=utf-8",
	".js":          "text/javascript; charset=utf-8",
	".css":         "text/css; charset=utf-8",
	".json":        "application/json; charset=utf-8",
	".webmanifest": "application/manifest+json; charset=utf-8",
	".svg":         "image/svg+xml",
	".png":         "image/png",
	".ico":         "image/x-icon",
}

// watch counts the pages that are open and says when the last one has gone.
type watch struct {
	mu       sync.Mutex
	open     int
	everOpen bool
	lastSeen time.Time
}

func (w *watch) enter() {
	w.mu.Lock()
	w.open++
	w.everOpen = true
	w.mu.Unlock()
}

func (w *watch) leave() {
	w.mu.Lock()
	w.open--
	w.lastSeen = time.Now()
	w.mu.Unlock()
}

// finished reports whether every window has been closed for long enough, or
// none ever opened.
func (w *watch) finished(started time.Time) bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.open > 0 {
		return false
	}
	if !w.everOpen {
		return time.Since(started) > neverOpened
	}
	return time.Since(w.lastSeen) > closedAfter
}

func handler(files fs.FS, pages *watch) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/alive", func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "cannot stream", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, ": hello\n\n")
		flusher.Flush()
		pages.enter()
		defer pages.leave()
		// A line now and then keeps the connection from being dropped as idle.
		tick := time.NewTicker(20 * time.Second)
		defer tick.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case <-tick.C:
				fmt.Fprint(w, ": still here\n\n")
				flusher.Flush()
			}
		}
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "not allowed", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name == "" {
			name = "index.html"
		}
		data, err := fs.ReadFile(files, name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		kind := types[strings.ToLower(path.Ext(name))]
		if kind == "" {
			kind = mime.TypeByExtension(path.Ext(name))
		}
		if kind == "" {
			kind = "application/octet-stream"
		}
		if name == "index.html" {
			page := string(data)
			if cut := strings.LastIndex(page, "</body>"); cut >= 0 {
				page = page[:cut] + heartbeat + page[cut:]
			} else {
				page += heartbeat
			}
			data = []byte(page)
		}
		w.Header().Set("Content-Type", kind)
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.WriteHeader(http.StatusOK)
		if r.Method == http.MethodGet {
			w.Write(data)
		}
	})

	// Only this computer's own browser may ask, and only by this address:
	// that shuts out other sites trying to reach the game through the
	// player's browser.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Host != address {
			http.Error(w, "not here", http.StatusForbidden)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

// browsers lists where an app-window-capable browser may be found, best first.
func browsers() []string {
	var found []string
	switch runtime.GOOS {
	case "windows":
		roots := []string{os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"), os.Getenv("LocalAppData")}
		for _, sub := range []string{`Microsoft\Edge\Application\msedge.exe`, `Google\Chrome\Application\chrome.exe`} {
			for _, root := range roots {
				if root != "" {
					found = append(found, filepath.Join(root, sub))
				}
			}
		}
	case "darwin":
		found = append(found,
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge")
	default:
		for _, name := range []string{"google-chrome", "chromium", "chromium-browser", "microsoft-edge"} {
			if full, err := exec.LookPath(name); err == nil {
				found = append(found, full)
			}
		}
	}
	return found
}

// dataDir is where the game's own browser profile lives: saved games, and
// nothing shared with the player's everyday browsing.
func dataDir() string {
	base, err := os.UserCacheDir() // %LocalAppData% on Windows
	if err != nil {
		base = os.TempDir()
	}
	// The folder keeps the name the game was first released under, whatever
	// it is called now, so that a renamed game still finds its saved games.
	return filepath.Join(base, "truckbuild", "Profile")
}

// openWindow shows the game. It returns as soon as the browser has been
// asked; it does not wait for the window to close.
func openWindow() error {
	for _, browser := range browsers() {
		if _, err := os.Stat(browser); err != nil {
			continue
		}
		cmd := exec.Command(browser,
			"--app="+home,
			"--user-data-dir="+dataDir(),
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-background-mode",
			"--start-maximized",
		)
		if err := cmd.Start(); err == nil {
			go cmd.Wait()
			return nil
		}
	}
	// No Edge or Chrome: whatever opens web pages on this computer.
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", home)
	case "darwin":
		cmd = exec.Command("open", home)
	default:
		cmd = exec.Command("xdg-open", home)
	}
	if err := cmd.Start(); err != nil {
		return err
	}
	go cmd.Wait()
	return nil
}

// selftest serves the game and fetches a few of its files, as a check that
// the program was put together properly. It opens no window.
func selftest() int {
	wanted := map[string]string{
		"":                     "text/html",
		"src/main.js":          "text/javascript",
		"styles/main.css":      "text/css",
		"manifest.webmanifest": "application/manifest+json",
		"icons/icon-192.png":   "image/png",
	}
	failed := 0
	for name, kind := range wanted {
		response, err := http.Get(home + name)
		if err != nil {
			fmt.Println("FAILED", name, err)
			failed++
			continue
		}
		body, _ := io.ReadAll(response.Body)
		response.Body.Close()
		got := response.Header.Get("Content-Type")
		if response.StatusCode != http.StatusOK || !strings.HasPrefix(got, kind) || len(body) == 0 {
			fmt.Printf("FAILED %q: status %d, type %q, %d bytes\n", name, response.StatusCode, got, len(body))
			failed++
			continue
		}
		if name == "" && !strings.Contains(string(body), heartbeat) {
			fmt.Println("FAILED: the page does not hold a connection open")
			failed++
			continue
		}
		fmt.Printf("ok %q: %s, %d bytes\n", name, got, len(body))
	}
	if response, err := http.Get(home + "../main.go"); err == nil {
		response.Body.Close()
		if response.StatusCode != http.StatusNotFound {
			fmt.Println("FAILED: served a file from outside the game")
			failed++
		}
	}
	if failed > 0 {
		return 1
	}
	fmt.Println("selftest passed")
	return 0
}

func main() {
	files, err := fs.Sub(bundled, "www")
	if err != nil {
		os.Exit(2)
	}
	testing := len(os.Args) > 1 && os.Args[1] == "--selftest"

	listener, err := net.Listen("tcp", address)
	if err != nil {
		// Almost certainly the game is already running: show its window again.
		if testing {
			fmt.Println("FAILED: could not listen on", address, err)
			os.Exit(1)
		}
		openWindow()
		return
	}

	pages := &watch{}
	server := &http.Server{Handler: handler(files, pages), ReadHeaderTimeout: 10 * time.Second}
	go server.Serve(listener)

	if testing {
		os.Exit(selftest())
	}

	started := time.Now()
	if err := openWindow(); err != nil {
		os.Exit(3)
	}
	for !pages.finished(started) {
		time.Sleep(500 * time.Millisecond)
	}
}
