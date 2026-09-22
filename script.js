console.log("lets write some javascript");

let currentSong = new Audio();
let songs = [];
let currFolder;

let play = document.querySelector("#play");
let previous = document.querySelector("#previous");
let next = document.querySelector("#next");

//Time format changing
function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
  currFolder = folder;
  let a = await fetch(`/${folder}/`);
  if (!a.ok) throw new Error(`Failed to load ${a.url}: ${a.status}`);
  let response = await a.text();
  let div = document.createElement("div");
  div.innerHTML = response;
  let as = div.getElementsByTagName("a");
  songs = [];
  for (let index = 0; index < as.length; index++) {
    const element = as[index];
    const base = new URL(`/${folder}/`, window.location.origin);
    const href = element.getAttribute("href");
    if (!href) continue;
    const url = new URL(href, a.url || base.href);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      continue;
    const filename = url.pathname.slice(base.pathname.length);
    if (filename && !filename.includes("/") && /\.mp3$/i.test(filename)) {
      songs.push(filename);
    }
  }

  //show all the songs in the playlist
  let songUl = document
    .querySelector(".songList")
    .getElementsByTagName("ul")[0];
  songUl.innerHTML = "";
  for (const song of songs) {
    songUl.innerHTML =
      songUl.innerHTML +
      `<li data-song="${song}">
    <img class="invert" src="img/music.svg" alt="">
                <div class="info">
                  <div>${decodeURIComponent(song)}</div>
                </div>
                <div class="playnow">
                  <span>Play Now</span>
                  <img class="invert" src="img/play.svg" alt="" srcset="">
                </div> </li>`;
  }

  // attach an event listner to each song
  Array.from(
    document.querySelector(".songList").getElementsByTagName("li"),
  ).forEach((e) => {
    e.addEventListener("click", () => {
      playMusic(e.dataset.song);
    });
  });

  return songs;
}

const playMusic = (track, pause = false) => {
  if (typeof track !== "string" || !track.trim()) {
    currentSong.pause();
    currentSong.removeAttribute("src");
    currentSong.load();
    play.src = "img/play.svg";
    document.querySelector(".songinfo").textContent = "No songs found";
    document.querySelector(".songtime").textContent = "00:00 / 00:00";
    return;
  }
  currentSong.src = `/${currFolder}/` + track;
  if (!pause) {
    currentSong.play();
    play.src = "img/pause.svg";
  }
  document.querySelector(".songinfo").textContent = decodeURIComponent(track);
  document.querySelector(".songtime").textContent = "00:00 / 00:00";
};

async function displayAlbum() {
  let a = await fetch(`/songs/`);
  if (!a.ok) throw new Error(`Failed to load ${a.url}: ${a.status}`);
  let response = await a.text();
  let div = document.createElement("div");
  div.innerHTML = response;
  let anchors = div.getElementsByTagName("a");
  let cardContainer = document.querySelector(".cardContainer");

  let array = Array.from(anchors);
  for (let index = 0; index < array.length; index++) {
    const e = array[index];
    const href = e.getAttribute("href");
    if (!href) continue;
    const base = new URL("/songs/", window.location.origin);
    const url = new URL(href, a.url || base.href);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      continue;
    const relative = url.pathname.slice(base.pathname.length);
    if (/^[^/]+\/?$/.test(relative)) {
      let folder = relative.replace(/\/$/, "");

      // if (/^[^/]+\/$/.test(relative)) {
      //   let folder = relative.slice(0, -1);

      //get metadata of the folder
      let a = await fetch(`/songs/${folder}/info.json`);
      if (!a.ok) {
        console.warn(
          `Skipping album ${folder}: info.json returned ${a.status}`,
        );
        continue;
      }
      let response;
      try {
        response = await a.json();
      } catch (error) {
        console.warn(`Skipping album ${folder}: invalid info.json`, error);
        continue;
      }

      cardContainer.innerHTML += `<div data-folder="${folder}" class="card">
            <i class="fa-solid fa-circle-play play"></i>
            <img src="/songs/${folder}/cover.jpg" alt="">  
            <h3>${response.title}</h3>
            <p>${response.description}</p>
            </div>`;
    }
  }

  //Looad the playlist whenever it clicked
  Array.from(document.getElementsByClassName("card")).forEach((e) => {
    e.addEventListener("click", async (item) => {
      songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);

      //play the frist song
      playMusic(songs[0]);
    });
  });
}

async function main() {
  // get the list of all songs
  await getSongs("songs/chatpata");
  playMusic(songs[0], true);

  //display All the albums on the page
  displayAlbum().catch(console.error);

  // Play Pause button
  play.addEventListener("click", () => {
    if (!currentSong.getAttribute("src")) return;
    if (currentSong.paused) {
      currentSong.play();
      play.src = "img/pause.svg";
    } else {
      currentSong.pause();
      play.src = "img/play.svg";
    }
  });

  //Automatically Play the next song
  currentSong.addEventListener("ended", () => {
    const index = songs.findIndex(
      (song) =>
        new URL(`/${currFolder}/${song}`, window.location.origin).href ===
        currentSong.src,
    );

    if (index >= 0 && index + 1 < songs.length) {
      playMusic(songs[index + 1]);
    } else {
      play.src = "img/play.svg";
    }
  });

  //Listen for time update
  currentSong.addEventListener("timeupdate", () => {
    document.querySelector(".songtime").innerHTML =
      `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;

    document.querySelector(".circle").style.left =
      `${(currentSong.currentTime / currentSong.duration) * 100}%`;
  });

  //Add eventlistner to seekbar
  document.querySelector(".seekbar").addEventListener("click", (e) => {
    console.log(e);
    let percent = e.offsetX / e.currentTarget.offsetWidth;
    currentSong.currentTime = currentSong.duration * percent;
  });

  //Add an eventlistener to hamburger btn
  document.querySelector(".hamburger").addEventListener("click", (e) => {
    document.querySelector(".left").style.left = "0";
  });

  //Add an eventListener to close btn
  document.querySelector(".close").addEventListener("click", (e) => {
    document.querySelector(".left").style.left = "-130%";
  });

  //Add an event listener to previous and next
  // Add an event listener to previous
  previous.addEventListener("click", () => {
    currentSong.pause();
    console.log("Previous clicked");
    let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
    if (index - 1 >= 0) {
      playMusic(songs[index - 1]);
    }
  });

  // Add an event listener to next
  next.addEventListener("click", () => {
    currentSong.pause();
    console.log("Next clicked");

    let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
    if (index + 1 < songs.length) {
      playMusic(songs[index + 1]);
    }
  });

  //Add an eventListner to volume
  document
    .querySelector(".range")
    .getElementsByTagName("input")[0]
    .addEventListener("change", (e) => {
      console.log("Setting volume to", e.target.value, "/ 100");
      currentSong.volume = parseInt(e.target.value) / 100;
    });

  //Add an eventListener in volume btn for mute
  document.querySelector(".volume img").addEventListener("click", (e) => {
    let range = document
      .querySelector(".range")
      .getElementsByTagName("input")[0];
    if (e.target.src.includes("volume.svg")) {
      e.target.src = e.target.src.replace("volume.svg", "mute.svg");
      range.value = 0;
      currentSong.volume = 0;
    } else {
      e.target.src = e.target.src.replace("mute.svg", "volume.svg");
      range.value = 10;
      currentSong.volume = 0.1;
    }
  });
}
main().catch(console.error);
