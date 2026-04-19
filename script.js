// Routing and collection selection based on URL path
// const rawPath = (window.location.pathname || '/').toLowerCase();
let thisName, otherName;
// switch (rawPath) {
//   case '/fifi':
//     thisName = 'Fifi';
//     otherName = 'Totoro';
//     document.querySelector('.container').hidden = false;
//     break;
//   case '/totoro':
    thisName = 'Totoro';
    otherName = 'Fifi';
    document.querySelector('.container').hidden = false;
//     break;
// }
const thisCollection = `Qpid-${thisName}`;
const otherCollection = `Qpid-${otherName}`;
const archiveTitle = document.getElementById('archiveTitle');
archiveTitle.textContent = `${otherName}'s Archive`;
document.getElementById('welcome').textContent = `Welcome back ${thisName}! ❤️`;

// Initialize archive state
const PAGE_SIZE = 10;
let currentPage = 1;
let currentArchiveCollection = otherCollection;
let currentDetailIndex = -1;

// Swap collection button logic
const swapBtn = document.getElementById('swapCollection');
swapBtn.textContent = `Go to ${thisName}'s Archive`;
swapBtn.addEventListener('click', function(){
  swapBtn.textContent = swapBtn.textContent == `Go to ${otherName}'s Archive` ? `Go to ${thisName}'s Archive` : `Go to ${otherName}'s Archive`;
  archiveTitle.textContent = archiveTitle.textContent == `${thisName}'s Archive` ? `${otherName}'s Archive` : `${thisName}'s Archive`;
  // reset to first page when switching
  currentPage = 1;
  currentArchiveCollection = archiveTitle.textContent.includes(thisName) ? thisCollection : otherCollection;
  renderArchiveList(currentArchiveCollection, currentPage);
});

// Mood slider live value update
const moodSliderEl = document.getElementById('moodSlider');
const moodValueEl = document.getElementById('moodValue');
if(moodSliderEl && moodValueEl){
  moodValueEl.textContent = moodSliderEl.value;
  moodSliderEl.addEventListener('input', () => {
    moodValueEl.textContent = moodSliderEl.value;
  });
}

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBLqH1dA1-m-bv0-xuld1-U-CG7YZtPi2k",
  authDomain: "tfplusplus.firebaseapp.com",
  projectId: "tfplusplus",
  storageBucket: "tfplusplus.firebasestorage.app",
  messagingSenderId: "552430845365",
  appId: "1:552430845365:web:9485213665d1ede16f6dfc",
  measurementId: "G-J1H8W799SK"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let processedInitialSnapshot = false;

// Handle form submission
document.getElementById('dataForm').addEventListener('submit', function(e){
  e.preventDefault();
  const v1 = document.getElementById('input1').value.trim();
  const v2 = document.getElementById('input2').value.trim();
  const v3 = document.getElementById('input3').value.trim();
  if(!(v1 && v2 && v3)) {
    alert('Oopsie! Did you miss a question? ');
    return;
  }
  const moodEl = document.getElementById('moodSlider');
  const mood = moodEl ? parseInt(moodEl.value, 10) : null;
  if(!(mood >= 1 && mood <= 10)){
    alert('Please select a mood between 1 and 10.');
    return;
  }
  const docId = new Date().toISOString();
  // Save mood as a numeric field `mood` alongside the text fields and timestamp
  db.collection(thisCollection).doc(docId).set({field1:v1,field2:v2,field3:v3,mood:mood,createdAt:firebase.firestore.FieldValue.serverTimestamp()})
    .then(() => fetchCollection(thisCollection))
    .catch(err => console.error('Firestore write failed', err));
  document.getElementById('dataForm').reset();
  document.getElementById('dataForm').hidden = true;
  document.getElementById('submitted').hidden = false;
});

// Event listeners
function openDetails(collectionName, id){
  const localData = JSON.parse(localStorage.getItem(`local_${collectionName}`)) || [];
  const idx = localData.findIndex(item => item.id === id);
  if(idx === -1) return;
  const data = localData[idx].data || {};
  currentArchiveCollection = collectionName;
  currentDetailIndex = idx;
  document.getElementById('detailField1').textContent = `${data.field1 || ''}`;
  document.getElementById('detailField2').textContent = `${data.field2 || ''}`;
  document.getElementById('detailField3').textContent = `${data.field3 || ''}`;
  document.getElementById('detailsTitle').textContent = `${archiveTitle.textContent}`;
  document.getElementById('detailsDate').textContent = `${id.split('T')[0]}`;
  document.getElementById('details').hidden = false;
  document.getElementById('archive').hidden = true;

  // show mood in details
  const moodDisplay = document.getElementById('detailMood');
  if(moodDisplay) moodDisplay.textContent = (data.mood !== undefined && data.mood !== null) ? String(data.mood) : '';

  // Update Prev/Next buttons
  const prevBtn = document.getElementById('detailsPrev');
  const nextBtn = document.getElementById('detailsNext');
  document.getElementById('detailsPageInfo').textContent = `${idx + 1} / ${localData.length}`;
  if(prevBtn) {
    prevBtn.disabled = idx <= 0;
    prevBtn.onclick = () => {
      const ndx = Math.max(0, idx - 1);
      openDetails(collectionName, localData[ndx].id);
    };
  }
  if(nextBtn) {
    nextBtn.disabled = idx >= localData.length - 1;
    nextBtn.onclick = () => {
      const ndx = Math.min(localData.length - 1, idx + 1);
      openDetails(collectionName, localData[ndx].id);
    };
  }
}

document.getElementById('viewArchive').addEventListener('click', function(){
  document.getElementById('archive').hidden = false;
  document.getElementById('mainPage').hidden = true;
});

// document.getElementById('closeArchive').addEventListener('click', function(){
//   document.getElementById('archive').hidden = true;
//   document.getElementById('mainPage').hidden = false;
// });

document.getElementById('closeDetails').addEventListener('click', function(){
  document.getElementById('details').hidden = true;
  document.getElementById('archive').hidden = false;
});

// Keep local submitted document ids to detect external submissions (scoped per collection)
function fetchCollection(collectionName){
  let localCollection = [];
  db.collection(collectionName).orderBy('createdAt', 'desc').get().then(snapshot => {
    snapshot.forEach(doc => {
      localCollection.push({id: doc.id, data: doc.data()});
    });
    localStorage.setItem(`local_${collectionName}`, JSON.stringify(localCollection));
  }).catch(err => console.error('Error fetching initial documents', err));
}
fetchCollection(thisCollection);
fetchCollection(otherCollection);

// Render archive list from localStorage (which is updated on the initial fetch)
function renderArchiveList(collectionName, page = 1){
  const list = document.getElementById('archiveList');
  if(!list) return;
  list.innerHTML = '';
  const localData = JSON.parse(localStorage.getItem(`local_${collectionName}`)) || [];
  // Sort newest first. Handle Firestore timestamps generically.
  localData.sort((a, b) => {
    const ta = a.data && a.data.createdAt;
    const tb = b.data && b.data.createdAt;
    const da = ta && ta.toDate ? ta.toDate() : new Date(ta);
    const db = tb && tb.toDate ? tb.toDate() : new Date(tb);
    return db - da;
  });

  const total = localData.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const slice = localData.slice(start, start + PAGE_SIZE);

  slice.forEach(({id, data}) => {
    const li = document.createElement('li');
    li.textContent = id.split('T')[0];
    li.dataset.id = id;
    li.addEventListener('click', () => openDetails(collectionName, id));
    list.appendChild(li);
  });

  // Update controls state
  const prevBtn = document.getElementById('archivePrev');
  const nextBtn = document.getElementById('archiveNext');
  const pageInfo = document.getElementById('archivePageInfo');
  if(pageInfo) pageInfo.textContent = `${clampedPage} / ${totalPages}`;
  if(prevBtn) prevBtn.disabled = clampedPage <= 1;
  if(nextBtn) nextBtn.disabled = clampedPage >= totalPages;

  // attach handlers (re-attach safe)
  if(prevBtn) prevBtn.onclick = () => {
    currentPage = Math.max(1, clampedPage - 1);
    renderArchiveList(collectionName, currentPage);
  };
  if(nextBtn) nextBtn.onclick = () => {
    currentPage = Math.min(totalPages, clampedPage + 1);
    renderArchiveList(collectionName, currentPage);
  };
}

renderArchiveList(otherCollection, 1);

// Check if today's entry has already been submitted (based on localStorage)
function checkTodaySubmitted(collectionName){
  const localData = JSON.parse(localStorage.getItem(`local_${collectionName}`)) || [];
  const today = new Date().toISOString().split('T')[0];
  return localData.some((data) => data.id.startsWith(today));
}

if (checkTodaySubmitted(thisCollection)){
  document.getElementById('submitBtn').disabled = true;
  document.getElementById('dataForm').hidden = true;
  document.getElementById('submitted').hidden = false;
}