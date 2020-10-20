const GITHUB_ACCESS_TOKEN = "useful-forks-access-token";


function status(response) {
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response)
  } else {
    return Promise.reject(new Error(response.statusText))
  }
}

function json(response) {
  return response.json()
}

// for headers:  https://stackoverflow.com/a/45753864/9768291
document.querySelector('#theBtn').addEventListener('click',
    () => fetch('https://api.github.com/repos/payne911/PieMenu/forks?sort=stargazers&per_page=100&page=1',
        {mode: 'cors'})
    .then(status)
    .then(json)
    .then(response => console.log(response)));

// // import getStarHistory from '../../core/getStarHistory';
// // import draw from './draw';

let data = [];

let token = localStorage.getItem(GITHUB_ACCESS_TOKEN);
drawAddTokenBtn(token);

// async function getRepoNameFetchAndDraw() {
//   // get repo str (format: 'timqian/star-history')
//   let repo = ''
//   let rawRepoStr = document.getElementById('repo').value;
//   if (rawRepoStr.includes('github.com')) {
//     rawRepoStr += '\/'      // make sure url end with /
//     repo = /github.com\/(\S*?\/\S*?)[\/#?]/.exec(rawRepoStr)[1];
//   } else {
//     repo = rawRepoStr == '' ? 'timqian/star-history' : rawRepoStr;
//   }
//
//   for (let item of data) {
//     if (item.label == repo) {
//       notie.alert({ text: 'This repo is already on the chart', type: 'warning' });
//       return;
//     }
//   }
//
//   token = localStorage.getItem(GITHUB_ACCESS_TOKEN);
//   await fetchDataAndDraw(repo, token);
// }


document.getElementById('theBtn').addEventListener('click', async event => {
  event.preventDefault();
  console.log("PRESSED THE BUTTON"); // todo
  // await getRepoNameFetchAndDraw();
});

document.querySelector('#repo').addEventListener('keyup', async (e) => {
  if (e.keyCode === 13) {
    console.log("PRESSED ENTER"); // todo
  }
});

const localToken = localStorage.getItem(GITHUB_ACCESS_TOKEN);
if (localToken) {
  document.getElementById('tokenInput').value = localToken;
}

document.getElementById('addTokenBtn').addEventListener('click', event => {
  event.preventDefault();
  document.querySelector('.modal').classList.add('is-active');
});

document.getElementById('closeModalBtn').addEventListener('click', e => {
  e.preventDefault();
  document.querySelector('.modal').classList.remove('is-active');
});

document.getElementById('saveTokenBtn').addEventListener('click', e => {
  e.preventDefault();
  const token = document.getElementById('tokenInput').value;
  localStorage.setItem(GITHUB_ACCESS_TOKEN, token);
  document.querySelector('.modal').classList.remove('is-active');
  drawAddTokenBtn(token);
});

function drawAddTokenBtn(accessToken) {
  let verb = 'Add';
  if (accessToken) {
    verb = 'Edit'
  }
  const tokenBtn = '<img src="assets/settings-icon.png" alt="settings" />'
      + '<strong>&nbsp;&nbsp;' + verb + ' Access Token</strong>'
  document.getElementById('addTokenBtn').innerHTML = tokenBtn;
  document.getElementById('modalCardTitle').innerHTML = verb + ' GitHub Access Token';
}

// async function fetchDataAndDraw(repo, token) {
//
//   document.getElementById('theBtn').setAttribute("disabled", "disabled");
//   document.getElementById('theBtn').classList.add('is-loading');
//
//   try {
//     const starHistory = await getStarHistory(repo, token);
//     // new data
//     data.push({
//       label: repo,
//       data: starHistory.map((item) => {
//         return {
//           x: new Date(item.date),
//           y: Number(item.starNum)
//         }
//       }),
//     });
//
//     draw(data);
//
//     if (location.hash === '') {
//       location.hash += repo;
//     } else if (location.hash.length >=3 && !location.hash.includes(repo)) { // minimal sample of repo name 'a/b'
//
//       location.hash += '&' + repo;
//     }
//   } catch (error) {
//     console.dir(error);
//     if (error.response.status === 403) {
//       notie.alert({ text: 'GitHub API rate limit exceeded', type:'warning' });
//
//       setTimeout(() => {
//         document.querySelector('.modal').classList.add('is-active');
//       }, 2500);
//     } else if (error.response.status === 404) {
//       notie.alert({text:'No such repo', type:'warning' })
//     } else {
//       notie.alert({text:'Some unexpected error happened, try again', type:'warning' })
//     }
//   }
//
//   document.getElementById('theBtn').removeAttribute("disabled");
//   document.getElementById('theBtn').classList.remove('is-loading');
//   document.getElementById('button-group').style.visibility = 'visible';
//   document.getElementById('chart').style.visibility = 'visible';
// }