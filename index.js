// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
    fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
	
	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
		
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

// Do the Socket.IO magic:
let bigArray = [];
let userArray = [];
let chatroomArray = [];
let privateRoomArray = [];
let privateRoomPasswords = [];
var privateDict = [];
let tBannedUsers = [];
let pBannedUsers = [];
var roomName;
var password;
var rooms;
var privateMessage = [];
var roomDisplay = [];
var privateDisplay = [];
var roomPassword = [];
let creatorArray = [];
var displayUsers = [];
var creatorPrivateArray = [];
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.
	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.
		console.log("User: " + data["user"]);
        console.log("message: "+ data["message"]); // log it to the Node.JS output
        for(var x = 0; x < chatroomArray.length; x++){
            if(data["currentRoom"] == chatroomArray[x].roomName){
                chatroomArray[x].messages.push(data["message"]);
                data["privateRoom"] = "null";
            }
        }
        for(var y = 0; y < privateRoomArray.length; y++){
            if(data["privateRoom"] == privateRoomArray[y].roomName){
                privateRoomArray[y].messages.push(data["message"]);
                data["currentRoom"] = "null";
            }
        }
        io.sockets.emit("message_to_client", {username: data["user"], message:data["message"], room: data["currentRoom"], privateName: data["privateRoom"]}) // broadcast the message to other users
    });
    socket.on('register', function(data){
        userArray.push(data["user"]);
        console.log(data["user"]);
        socket.username = data["user"];
        for(var x = 0; x < chatroomArray.length; x++){
            roomDisplay[x] = chatroomArray[x].roomName;
        }
        for(var y = 0; y < privateRoomArray.length; y++){
            privateDisplay[y] = privateRoomArray[y].roomName;
        }
        io.sockets.emit("registerClient", {username: data["user"], roomDisplay, privateDisplay});
    })
    socket.on('public', function(data){
        chatroomArray.push({roomName: data["publicRoom"], users: [], messages: [], bannedUsers: []});
        creatorArray.push({roomName: data["publicRoom"], owner: data["user"]});
        console.log("CREATOR: " + data["user"]);
        console.log("Made it to server, name: " + data["publicRoom"]);
        socket.publicName = data["publicRoom"];
        io.sockets.emit("publicClient", {publicRoom: data["publicRoom"]})
    })
    socket.on('private', function(data){
        privateRoomArray.push({roomName: data["privateRoom"], password: data["privatePass"], users: [], messages: [], bannedUsers: []});
        creatorPrivateArray.push({roomName: data["privateRoom"], owner: data["user"]});
        console.log("private room array: " + privateRoomArray);
        console.log("Made it to server, name: " + data["privateRoom"]);
        console.log("Made it to server, password: " + data["privatePass"]);
        socket.privateName = data["privateRoom"];
        socket.privatePassword = data["privatePass"];
        io.sockets.emit("privateClient", {privateRoom: data["privateRoom"]})
    })
    socket.on('logout', function(data){
        console.log("User Disconnected");
        userArray.splice(data["user"]);             //delete user from online users
        io.sockets.emit("disconnectClient", {username: data["user"]});
        data["user"] = "Guest";
    })
    socket.on('privateMessage', function(data){
        console.log("Sending private message");
        io.sockets.emit("msgClient", {privateUser: data["privateUser"], privateMsg: data["privateMessage"], sender: data["name"]})
        // io.sockets.to(socket.privateUser).emit('msgClient', {privateMessage: data["privateMessage"]});
        console.log("After command");
    })

    socket.on('joinChat', function(data){
        console.log("Made it to server");
        console.log(socket.username);
        var check = false;
        for(var y = 0; y < chatroomArray.length; y++){
            for(var k = 0; k < chatroomArray[y].bannedUsers.length; k++){
                if (socket.username == chatroomArray[y].bannedUsers[k] && chatroomArray[y].roomName == data["desiredRoom"]){
                    console.log("User is permanently banned");
                    io.sockets.emit("failedPublic", {failUser: data["user"]});
                    check = true;
            }
            
            }
        }
                if(check == false){
                for(var x = 0; x < chatroomArray.length; x++){
                    console.log(data["desiredRoom"]);
                    if(data["desiredRoom"] == chatroomArray[x].roomName){
                        chatroomArray[x].users.push(socket.username);
                        console.log("chatroom Array: " + chatroomArray[x].users);
                        console.log("CURRENT USERNAME: " + socket.username);
                        io.sockets.emit("joinClient", {roomName: data["desiredRoom"], currentUser: socket.username, userArray: userArray});
                    }
                }
            }
    })
    socket.on('privateJoin', function(data){
        var check = false;
        console.log("socket username: " + socket.username);
        console.log()
        for(var y = 0; y < privateRoomArray.length; y++){
            for(var k = 0; k < privateRoomArray[y].bannedUsers.length; k++){
                console.log(" socket username test: " + privateRoomArray[y].bannedUsers[k]);
                console.log("room name check: " + privateRoomArray[y].roomName);
                console.log("match to ^ : " + data["privateGroup"]);
                if (socket.username == privateRoomArray[y].bannedUsers[k] && privateRoomArray[y].roomName == data["privateGroup"]){
                    console.log("User is permanently banned");
                    io.sockets.emit("failedPublic", {failUser: data["user"]});
                    check = true;
            }
            
            }
        }
        if(check == false){
            var exit = false;
            for(var x = 0; x < privateRoomArray.length; x++){
                console.log(data["privateGroup"]);
                if(data["privateGroup"] == privateRoomArray[x].roomName && data["privatePassword"] == privateRoomArray[x].password){
                    privateRoomArray[x].users.push(socket.username);
                    console.log("private chatroom Array: " + privateRoomArray[x].users);
                    console.log("CURRENT USERNAME: " + socket.username);
                    io.sockets.emit("joinPrivateClient", {roomName: data["privateGroup"], currentUser: socket.username, userArray: userArray});
                    exit = true;
            }
                if(exit == false){
                    console.log("Check");
                    io.sockets.emit("failedJoin", {roomName: data["privateGroup"], currentUser: socket.username, userArray: userArray});
                }

        }
    }
})
    socket.on('displayUsers', function(data){
        displayUsers = [];
        for(var x = 0; x < chatroomArray.length; x++){
            if(chatroomArray[x].roomName == data["currentRoom"]){
            displayUsers = chatroomArray[x].users;
            console.log("displayUsers: " + displayUsers);
        }
    }
        var user = socket.username;
        io.sockets.emit("displayClient", {displayUsers, users: user});
        
})
    socket.on('temporaryBan', function(data){
        console.log("Temporary Ban: " + data["tempUser"]);
        console.log("Before Users Array: " + userArray);
        io.sockets.emit("tempClient", {tempBan: data["tempUser"]})
    })
    socket.on('permanentBan', function(data){
        check = false;
        console.log("Permanent Ban: " + data["permUser"]);
        for(var x = 0; x < creatorArray.length; x++){
            if(creatorArray[x].owner == socket.username && creatorArray[x].roomName == data["roomBan"]){
                chatroomArray[x].bannedUsers.push(data["permUser"]);
                var test = chatroomArray[x].bannedUsers;
                console.log(test);
                check = true;
        } 
}
        if(check == false){ 
        for(var y = 0; y < creatorPrivateArray.length; y++){
                if(creatorPrivateArray[y].owner == socket.username && creatorPrivateArray[y].roomName == data["roomBan"]){
                    privateRoomArray[y].bannedUsers.push(data["permUser"]);
                    test = privateRoomArray[y].bannedUsers;
                    console.log("banned from private array: " + test);
                }
            }
        }
        io.sockets.emit("permClient", {permBan: data["permUser"], permRoom: data["roomBan"]})
    })
    // socket.on('onlineUsers', seeUsers)
    // socket.on('disconnect', function(){
    //     console.log('User Disconnected', client.id)
    //     disconnect();
    // })

   

});


