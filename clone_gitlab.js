const token = 'your_access_token';
const fs = require('fs');
const path = require('path');

function createFolder(name) {
    const folderPath = path.join(__dirname, name);
    
    if (!fs.existsSync(folderPath)) {
      fs.mkdir(folderPath, { recursive: true }, (err) => {
        if (err) {
          console.error('Error creating folder:', err);
          return;
        }
        console.log('Folder created:', folderPath);
      });
    } else {
      console.log('Folder already exists:', folderPath);
    }
}

function clone(url, folder) {
    const gitCommand = `cd ${folder} && git clone ${url}`;
    const { exec } = require('child_process');

    exec(gitCommand, (error, stdout, stderr) => {
    if (error) {
        console.error('Error cloning repository:', error);
        return;
    }
    console.log('Repository cloned:', url);
    });
}

function cloneFromGroup(groupId) {
    const url = `https://gitlab.com/api/v4/groups/${groupId}`
    fetch(url, {
      headers: {
        "PRIVATE-TOKEN": token,
      },
    })
      .then(response => response.json())
      .then(data => {
        const {projects} = data;
        if (projects.length > 0) {
            for (const {name_with_namespace, http_url_to_repo} of projects) {
              const namespaces = name_with_namespace.split(' / ');
              namespaces.pop();
              const nameFolder = namespaces.join("/");
              console.log(nameFolder);
              createFolder(nameFolder)
              clone(http_url_to_repo, nameFolder);
            }
        }

        // 
        cloneFromSubGroupsOfProject(groupId);
      });
}

// groupId
function getProjectOfGroup(groupId) {
    const url = `https://gitlab.com/api/v4/groups/${groupId}/projects`
    fetch(url, {
        headers: {
            "PRIVATE-TOKEN": token,
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
    });
}

// subgroups
function cloneFromSubGroupsOfProject(groupId) {
    const url = `https://gitlab.com/api/v4/groups/${groupId}/subgroups`
    fetch(url, {
        headers: {
          "PRIVATE-TOKEN": token,
        },
      })
        .then(response => response.json())
        .then(data => {
          if (data.length > 0) {
            for (const {id} of data) {
              cloneFromGroup(id);
            }
          }
        });
}

// clone from list group 
function cloneFromGroupList(groupIds) {
  for (const groupId of groupIds) {
    cloneFromGroup(groupId);
  }
}

// main run

const groupdId = "abc";
const groudIdList = ["abc1", "abc2"]

// get all repo of group id
// cloneFromGroup(groupdId);

// get all repo if group list
cloneFromGroupList(groudIdList);

