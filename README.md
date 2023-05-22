<div id="top"></div>
<br />

<div align="center">
<a href="https://github.com/RaceCar/Interface">
    <img src="https://avatars.githubusercontent.com/u/134273283?s=80" alt="Logo" width="auto" height="80" style="border-radius: 8px">
</a>

<h3 align="center">Interface</h3>

![Project Version](https://img.shields.io/github/package-json/v/RaceCast/Interface?label=Version)&nbsp;
![Project License](https://img.shields.io/github/license/RaceCast/Interface?label=Licence)

  <p align="center">
    User interface for displaying race car data.
    <br />
    <a href="https://rallye.minarox.fr/"><strong>rallye.minarox.fr »</strong></a>
  </p>
</div>
<br />

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#features">Features</a></li>
        <li><a href="#tech-stack">Tech Stack</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#start-development-server">Start development server</a></li>
        <li><a href="#deploy">Deploy</a></li>
      </ul>
    </li>
    <li><a href="#author">Author</a></li>
  </ol>
</details>

## About The Project

User interface gathering the information and the video stream returned by the onboard system from the race car.

### Features

- User connection status
- System connection status with latency
- Shutter status of the camera
- [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

### Tech Stack

- [VueJS](https://vuejs.org/)
    - [Sass](https://sass-lang.com/)
    - [Babel](https://babeljs.io/)
    - [EsLint](https://eslint.org/)
    - [Prettier](https://prettier.io/)
    - [Register Service Worker](https://www.npmjs.com/package/register-service-worker)
- [Socket.io](https://socket.io/)
- [OpenLayers](https://openlayers.org/)

<p align="right">(<a href="#top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Install [NodeJS](https://nodejs.org/) with [npm](https://www.npmjs.com/)

```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
```

### Start development server

- Install dependencies

````bash
  npm install
````

- Lint and fix files

````bash
  npm run lint
````

- Start development server

````bash
  npm run serve
````

- Open [http://localhost:8080](http://localhost:8080) to view it in the browser.

### Deploy

- Build for production

````bash
  npm run build
````

- The website is now in the `dist` folder ready to be deployed.

<p align="right">(<a href="#top">back to top</a>)</p>

## Author

[@Minarox](https://www.github.com/Minarox)

<p align="right">(<a href="#top">back to top</a>)</p>
