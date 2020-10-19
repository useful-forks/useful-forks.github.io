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
