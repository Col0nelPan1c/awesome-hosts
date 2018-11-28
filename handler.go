package main

import (
	"encoding/json"
	"github.com/asticode/go-astilectron"
	"github.com/asticode/go-astilectron-bootstrap"
)

func handleMessages(w *astilectron.Window, mi bootstrap.MessageIn) (payload interface{}, err error) {
	switch mi.Name {
	case "event.name":
		// Unmarshal payload
		var s string
		if err = json.Unmarshal(mi.Payload, &s); err != nil {
			payload = err.Error()
			return
		}
		payload = s + " world"
	case "list":
		payload = m.SystemHosts
	case "groups":
		payload = m.GetGroups()
	}

	return
}
