package main

import (
	"awesome-hosts/manager"
	"encoding/json"
	"fmt"
	"github.com/asticode/go-astilectron"
	"github.com/asticode/go-astilectron-bootstrap"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Payload interface{} `json:"payload"`
}

func handleMessages(w *astilectron.Window, mi bootstrap.MessageIn) (payload interface{}, err error) {
	var data map[string]interface{}
	data = make(map[string]interface{}, 0)
	if err = json.Unmarshal(mi.Payload, &data); err != nil {
		payload = err.Error()
		fmt.Println(err)
		return
	}
	fmt.Println(data)
	switch mi.Name {
	case "list":
		payload = ElectronResponse(1, "success", m.SystemHosts)
	case "groups":
		payload = ElectronResponse(1, "success", m.Groups)
	case "intranet":
		payload = ElectronResponse(1, "success", manager.GetIntranetIp())
	case "addHost":
		m.AddHost(data["groupName"].(string), manager.Host{IP: data["ip"].(string), Domain: data["domain"].(string), Enabled: true})
		payload = ElectronResponse(1, "success", nil)
		default:
		payload = ElectronResponse(404, "Not Found", nil)
	case "updateHost":
		if m.UpdateHost(data["groupName"].(string), int(data["index"].(float64)), data["ip"].(string), data["domain"].(string), data["enabled"].(bool)) {
			payload = ElectronResponse(1, "success", nil)
		} else {
			payload = ElectronResponse(0, "failed", nil)
		}
	case "enableGroup":
		if m.EnableGroup(data["groupName"].(string), data["enabled"].(bool)) {
			payload = ElectronResponse(1, "success", nil)
		} else {
			payload = ElectronResponse(0, "failed", nil)
		}
	case "syncSystemHostsUnix":
		m.SudoPassword = data["password"].(string)
		if m.SyncSystemHostsUnix() {
			payload = ElectronResponse(1, "success", nil)
		} else {
			payload = ElectronResponse(0, "failed", nil)
		}
	case "addGroup":
		if m.FindGroup(data["name"].(string)) != nil {
			payload = ElectronResponse(-1, "Group already exists", nil)
			return
		}
		if m.AddGroup(data["name"].(string), data["enabled"].(bool), data["hosts"].(string)) {
			payload = ElectronResponse(1, "success", m.Groups)
		} else {
			payload = ElectronResponse(0, "success", nil)
		}
	case "changeGroup":
		if m.FindGroupConfig(data["newName"].(string)) != nil {
			payload = ElectronResponse(-1, "Group already exists", nil)
			return
		}
		oldName := data["oldName"].(string)
		newName := data["newName"].(string)
		m.ChangeGroupName(oldName, newName)
		payload = ElectronResponse(1, "success", m.Groups)
	case "deleteGroup":
		if m.FindGroupConfig(data["groupName"].(string)) == nil {
			payload = ElectronResponse(0, "Group not exists", nil)
			return
		}
		m.DeleteGroup(data["groupName"].(string))
		payload = ElectronResponse(1, "success", m.Groups)
	}

	return
}

//func GetParams(data map[string]interface{}, name string) interface{} {
//	v, ok := data[name]
//	if !ok {
//		return nil
//	}
//	return v
//}

func ElectronResponse(code int, message string, payload interface{}) Response {
	return Response{Code: code, Message: message, Payload: payload}
}