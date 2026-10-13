// Classroom ambience: a looping recording of kids chattering (freesound community, "kids chatter primary school").
const audio = new Audio('assets/classroom.mp3');
audio.loop = true;
audio.volume = 0.6;

// true = sound on. Needs a user gesture the first time (browser autoplay rules).
export function setAmbience(on) {
  if (on) audio.play().catch(() => {});
  else audio.pause();
}
