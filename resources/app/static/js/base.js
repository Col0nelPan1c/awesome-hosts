let Server = function () {
};

Server.prototype.sendMessage = function (name, payload, callback) {
    // send a message to Go
    astilectron.sendMessage({name: name, payload: payload}, function (message) {
        console.log(message);
        callback(message.payload)
    });
};

(function () {
    let system = {
        defaultSystemHostsName: "System Hosts",
        // current group name
        currentGroupName: '',
        // table rows depended on this variable
        currentHosts: [],
        // put system hosts at here
        systemHosts: []
    };
    let server = new Server();
    let app = new Vue({
        el: '#app',
        data: {
            page: {
                pageSize: 100,
                currentPage: 1
            },
            loadingGroup: {
                hostsLoading: false,
                fullscreenLoading: true,
                addHostLoading: false,
                addGroupLoading: false,
                changeGroupLoading: false,
            },
            addHostForm: {
                inputIp: '',
                inputHost: '',
            },
            hostGroups: [],

            system: system,
            ipPrepareList: [],
            createNewGroupDialog: false,
            changeGroupDialog: false,
            newGroupForm: {
                data: {
                    name: '',
                    hosts: '',
                    enabled: true,
                },
                width: '80px'
            },
            changeGroupForm: {
                data: {
                    name: ''
                },
                width: '80px'
            }
        },
        methods: {
            // handleSizeChange: function (size) {
            //     this.pagesize = size;
            // },
            handleCurrentChange: function (currentPage) {
                this.page.currentPage = currentPage;
            },
            querySearch(queryString, show) {
                let ipPrepareList = this.ipPrepareList;
                let results = queryString ? ipPrepareList.filter(this.createFilter(queryString)) : ipPrepareList;
                // 调用 callback 返回建议列表的数据
                show(results);
            },
            createFilter(queryString) {
                return (ipPrepareList) => {
                    return (ipPrepareList.value.indexOf(queryString) === 0);
                };
            },
            handleSelect(item) {
                console.log(item);
            },
            loadIpPrepareList() {
                server.sendMessage("intranet", {}, (message) => {
                    var data = [{value: "127.0.0.1"}];
                    let ip = message.payload;
                    if (ip !== "") {
                        data.push({value: ip})
                    }
                    this.ipPrepareList = data;
                })
            },
            clearNewGroupForm: function () {
                this.newGroupForm.data = {
                    name: '',
                    hosts: '',
                    enabled: true
                };
                return this;
            },
            closeNewGroupDialog: function () {
                this.createNewGroupDialog = false;
            },
            addGroup: function () {
                this.loadingGroup.addGroupLoading = true;
                this.newGroupForm.data.name = this.newGroupForm.data.name.trim();
                if (this.newGroupForm.data.name === '') {
                    this.$message({
                        message: `Group name cannot be empty`,
                        type: 'error'
                    });
                    this.loadingGroup.addGroupLoading = false;
                    return;
                }
                server.sendMessage("addGroup", this.newGroupForm.data, (message) => {
                    let groupName = this.newGroupForm.data.name;
                    if (message.code === 1) {
                        this.clearNewGroupForm().closeNewGroupDialog();
                        this.hostGroups = message.payload;
                        this.hostGroups.unshift({
                            name: this.system.defaultSystemHostsName,
                            active: false,
                        });
                        this.$message({
                            message: `[${groupName}] Successfully added`,
                            type: 'success'
                        });
                    } else {
                        this.$message({
                            message: message.message,
                            type: 'error'
                        });
                    }
                    this.loadingGroup.addGroupLoading = false;
                });
            },
            importHosts: function (event) {
                if (event.file.type !== '' && event.file.type.indexOf("text") === -1) {
                    this.$alert("Not a text file, it\'s " + event.file.type, 'Warning', {
                        confirmButtonText: 'OK',
                        type: 'error'
                    });
                    return;
                }
                let reader = new FileReader();
                reader.onload = (file) => {
                    this.newGroupForm.data.hosts = file.target.result;
                };
                reader.readAsText(event.file);
            },
            enableGroup: function (value) {
                server.sendMessage("enableGroup", {
                    groupName: this.system.currentGroupName,
                    enabled: value
                }, (message) => {
                    if (message.code === 1) {
                        if (value) {
                            this.$message({
                                message: 'The group has been enabled.',
                                type: 'success'
                            });
                        } else {
                            this.$message({
                                message: 'The group has been disabled.',
                                type: 'info'
                            });
                        }
                    } else {
                        this.$message({
                            message: message.message,
                            type: 'error'
                        });
                    }
                });

            },
            openChangeGroupDialog: function (name) {
                this.changeGroupDialog = true;
                this.changeGroupForm.data.name = this.system.currentGroupName
            },
            //change property of group
            changeGroup: function () {
                let oldName = this.system.currentGroupName;
                let newName = this.changeGroupForm.data.name;
                if (oldName === newName) {
                    this.changeGroupDialog = false;
                    return;
                }
                this.loadingGroup.changeGroupLoading = true;
                server.sendMessage("changeGroup", {oldName: oldName, newName: newName}, (message) => {
                    if (message.code === 1) {
                        this.system.currentGroupName = newName;
                        this.changeGroupDialog = false;
                        for (let i in this.hostGroups) {
                            let item = this.hostGroups[i];
                            if (item.name === oldName) {
                                item.name = newName
                            }
                        }
                        this.$message({
                            message: 'The group has been enabled.',
                            type: 'success'
                        });
                    } else {
                        this.$message({
                            message: message.message,
                            type: 'error'
                        });
                    }
                    this.loadingGroup.changeGroupLoading = false;
                })
            },
            deleteGroup: function () {
                this.$confirm('Would you wanna delete this group? This operation will not be restored.', 'Delete Group', {
                    confirmButtonText: 'Yes',
                    cancelButtonText: 'No',
                    type: 'warning'
                }).then(() => {
                    server.sendMessage("deleteGroup", {groupName: this.system.currentGroupName}, (message) => {
                        this.hostGroups = message.payload;
                        this.hostGroups.unshift({
                            name: this.system.defaultSystemHostsName,
                            active: false,
                        });
                        this.selectGroup(this.hostGroups[this.hostGroups.length - 1].name)
                    });
                    this.$message({
                        type: 'success',
                        message: 'Successfully deleted'
                    });
                }).catch(() => {
                    //nothing to do
                });
            },
            //add host by row
            addHost: function () {
                if (this.system.currentGroupName === this.system.defaultSystemHostsName) {
                    return;
                }
                let ip = this.addHostForm.inputIp.trim();
                let domain = this.addHostForm.inputDomain.trim();
                if (ip === '' || domain === '') {
                    this.$message({
                        message: "IP or Domain was empty.",
                        type: "error"
                    });
                    return;
                }

                let groupName = this.system.currentGroupName;
                this.loadingGroup.addHostLoading = true;
                server.sendMessage("addHost", {groupName: groupName, ip: ip, domain: domain}, (message) => {
                    if (message.code !== 1) {
                        this.$message({
                            message: message.message,
                            type: "error"
                        });
                        return;
                    }
                    this.system.currentHosts.push({
                        ip: ip,
                        domain: domain,
                        enabled: true
                    });
                    //focus on ip input
                    this.$refs.ipInput.focus();
                    this.addHostForm.inputIp = '';
                    this.addHostForm.inputDomain = '';
                    this.loadingGroup.addHostLoading = false;
                    this.$message({
                        message: 'Added successfully',
                        type: 'success'
                    });
                });
            },
            //init, load System hosts and Groups
            init: function () {
                let _this = this;
                Promise.all([this.getList(this.system.defaultSystemHostsName), this.getHostGroups()]).then((results) => {
                    _this.hostGroups[0].active = true;
                    _this.system.currentGroupName = _this.hostGroups[0].name;
                    setTimeout(() => {
                        _this.loadingGroup.fullscreenLoading = false;
                    }, 500);
                }).catch(results => {
                    this.$message({
                        message: 'An error occurred while your operating',
                        type: 'error'
                    });
                    console.log(results)
                });
            },
            //fix rows index with page
            fixIndexOffset: function (index) {
                return (this.page.currentPage - 1) * this.page.pageSize + index
            },
            //change property of host by row
            changeHost: function (value, index) {
                let groupName = this.system.currentGroupName;
                index = this.fixIndexOffset(index);
                let host = this.system.currentHosts[index];
                if (host === null) {
                    this.$message({
                        message: 'Badly Host',
                        type: 'error'
                    });
                }
                server.sendMessage(
                    "updateHost",
                    {groupName: groupName, ip: host.ip, domain: host.domain, enabled: host.enabled, index: index},
                    (message) => {
                        if (message.code !== 1) {
                            this.$message({
                                message: message.message,
                                type: 'error'
                            });
                        }
                    });
            },
            //delete host by row
            deleteHost: function (index) {
                index = this.fixIndexOffset(index);
                let groupName = this.system.currentGroupName;
                if (groupName === this.system.defaultSystemHostsName) {
                    return;
                }
                server.sendMessage("deleteHost", {groupName: groupName, index: index}, (message) => {
                    if (message.code === 1) {
                        for (let i in this.hostGroups) {
                            let item = this.hostGroups[i];
                            if (item.name === groupName) {
                                item.hosts.splice(index, 1)
                            }
                        }
                    }
                });
            },
            //change group panel
            selectGroup: function (groupName) {
                this.page.currentPage = 1;
                this.loadingGroup.hostsLoading = true;
                for (let i in this.hostGroups) {
                    let item = this.hostGroups[i];
                    if (groupName === item.name) {
                        item.active = true;
                        if (groupName === this.system.defaultSystemHostsName) {
                            this.system.currentHosts = this.system.systemHosts;
                        } else {
                            if (item.hosts === null) {
                                this.hostGroups[i].hosts = []
                            }
                            this.system.currentHosts = item.hosts;
                        }
                        this.system.currentGroupName = item.name;
                    } else {
                        item.active = false;
                    }
                }
                this.loadingGroup.hostsLoading = false;
            },
            //get list from backend
            getList: function (groupName) {
                let _this = this;
                return new Promise((resolve) => {
                    server.sendMessage("list", {groupName: groupName}, (message) => {
                        if (message.payload === null) {
                            message.payload = [];
                        }
                        _this.system.currentHosts = message.payload;
                        if (groupName === this.system.defaultSystemHostsName) {
                            _this.system.systemHosts = message.payload;
                        }
                        _this.loadingGroup.hostsLoading = false;
                        resolve(true)
                    });
                })
            },
            //get groups with hosts from backend
            getHostGroups: function () {
                return new Promise((resolve) => {
                    server.sendMessage('groups', {}, (message) => {
                        if (message.payload === null) {
                            message.payload = []
                        }
                        this.hostGroups = message.payload;
                        this.hostGroups.unshift({
                            name: this.system.defaultSystemHostsName,
                            active: false,
                        });
                        resolve(true);
                    })
                })
            },
            //pop a dialog ask for enter the master password
            needPassword: function (payload) {
                this.$prompt('In order to sync hosts file you have to type in the administrator password.', 'Password', {
                    confirmButtonText: 'Confirm',
                    cancelButtonText: 'Cancel',
                    inputType: 'password'
                }).then(({value}) => {
                    server.sendMessage(payload, {password: value}, (message) => {
                        if (message.code == 1) {
                            this.$message({
                                type: 'success',
                                message: 'Synchronization success'
                            });
                        } else {
                            this.$message({
                                type: 'error',
                                message: message.message
                            });
                        }
                    });
                }).catch(() => {
                    this.$message({
                        type: 'error',
                        message: 'Synchronization failure'
                    });
                });
            }
        },
        mounted() {
            document.addEventListener('astilectron-ready', () => {
                //init
                this.init();
                //some tips for ip input
                this.loadIpPrepareList();
                //listen the message from backend
                astilectron.onMessage((message) => {
                    switch (message.name) {
                        case 'needPassword':
                            this.needPassword(message.payload);
                            break;
                        case 'updateSystemHosts':
                            this.system.systemHosts = message.payload;
                            break;
                    }
                });
            })
        }
    });
})();