const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ====== CẤU HÌNH ======
const token = ''; // <-- Nhập GitLab Personal Access Token ở đây
const gitlabUrl = ''; // hoặc https://gitlab.company.com
const fipId= 162;
const bmsId = 35;
const fadId = 616;
const groupIdList = [fadId]; // Có thể là tên hoặc ID của group
const cloneUsingSSH = false; // true nếu dùng SSH, false nếu dùng HTTPS
// =======================

async function createFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log('📁 Created folder:', folderPath);
  }
}

function cloneRepo(repoUrl, targetFolder, repoName) {
  const clonePath = path.join(targetFolder, repoName);

  if (fs.existsSync(clonePath)) {
    console.log(`✅ Skipped: ${repoName} already exists.`);
    return;
  }

  const cmd = `git clone ${repoUrl} "${clonePath}"`;

  console.log(`➡️ Cloning ${repoName} into ${targetFolder}...`);
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Clone failed for ${repoName}:`, error.message);
      return;
    }
    console.log(`✅ Cloned ${repoName}`);
  });
}

async function getProjects(groupId) {
  const projects = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${gitlabUrl}/api/v4/groups/${groupId}/projects?include_subgroups=true&per_page=${perPage}&page=${page}`;
    const res = await axios.get(url, {
      headers: { 'PRIVATE-TOKEN': token },
    });

    if (res.data.length === 0) break;

    projects.push(...res.data);
    page++;
  }

  return projects;
}

async function getSubGroups(groupId) {
  const url = `${gitlabUrl}/api/v4/groups/${groupId}/subgroups`;
  const res = await axios.get(url, {
    headers: { 'PRIVATE-TOKEN': token },
  });
  return res.data;
}

function parseNamespace(nameWithNamespace) {
  const parts = nameWithNamespace.split(' / ');
  const repoName = parts.pop();
  const folderPath = path.join(...parts);
  return { folderPath, repoName };
}

async function cloneFromGroup(groupId) {
  try {
    console.log(`🔍 Getting projects for group: ${groupId}`);
    const projects = await getProjects(groupId);

    for (const project of projects) {
      const { name_with_namespace, http_url_to_repo, ssh_url_to_repo } = project;
      const { folderPath, repoName } = parseNamespace(name_with_namespace);
      const fullPath = path.join(__dirname, folderPath);

      await createFolder(fullPath);
      const repoUrl = cloneUsingSSH ? ssh_url_to_repo : http_url_to_repo;

      cloneRepo(repoUrl, fullPath, repoName);
    }

    // Xử lý các subgroup (đệ quy)
    const subgroups = await getSubGroups(groupId);
    for (const subgroup of subgroups) {
      await cloneFromGroup(subgroup.id);
    }
  } catch (err) {
    console.error(`❌ Failed to process group ${groupId}:`, err.message);
  }
}

async function cloneFromGroupList(groupIds) {
  for (const id of groupIds) {
    await cloneFromGroup(id);
  }
}

// ======== CHẠY CHƯƠNG TRÌNH ========
cloneFromGroupList(groupIdList);
