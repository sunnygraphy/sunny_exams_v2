// JavaScript 코드를 여기에 작성합니다.
// 예시:
let current_subject = "약학";

document.addEventListener('DOMContentLoaded', function() {


    // 주제 선택 select 요소
    const topicSelect = document.getElementById('topic-select');
    topicSelect.addEventListener('change', function() {
        
         // 선택된 토픽 가져오기
        const selectedTopic = topicSelect.value;
        // title 요소 가져오기
        const subjectHeading = document.getElementById('subject'); // h1 요소 가져오기
        const titleElement = document.querySelector('title');
        console.log(titleElement)

        // 선택된 토픽에 따라 title 변경
        current_subject =  selectedTopic
        switch (selectedTopic) {
            case '약학':
                titleElement.textContent = '약학 퀴즈 프로그램';
                subjectHeading.textContent = '약학 퀴즈 프로그램';
                
                break;
            case '화학':
                titleElement.textContent = '화학 퀴즈 프로그램';
                subjectHeading.textContent = '화학 퀴즈 프로그램';
                break;
            case '물리':
                titleElement.textContent = '물리 퀴즈 프로그램';
                subjectHeading.textContent = '물리 퀴즈 프로그램';
                break;
            case '상식':
                titleElement.textContent = '상식 퀴즈 프로그램';
                subjectHeading.textContent = '상식 퀴즈 프로그램';
                break;
            default:
                titleElement.textContent = '약학 퀴즈 프로그램'; // 기본값 설정
                subjectHeading.textContent = '약학 퀴즈 프로그램';
                break;
        }
        
    });

    // 탭 클릭 이벤트 처리
    const tabButtons = document.querySelectorAll('#quizTab button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 클릭된 탭에 따라 문제 불러오기
            const tabId = this.getAttribute('data-bs-target');
            loadQuestions(tabId);
        });
    });

    // 제출 버튼 클릭 이벤트 처리
    const submitButton = document.getElementById('submit-button');
    submitButton.addEventListener('click', function() {
        checkAnswers();
    });

    // 데이터 소스 선택 select 요소
    const dataSourceSelect = document.getElementById('data-source-select');
    dataSourceSelect.addEventListener('change', function() {
        // 선택된 탭에 따라 문제 다시 불러오기
        const activeTab = document.querySelector('#quizTab .nav-link.active');

        if (activeTab) {
            const tabId = activeTab.getAttribute('data-bs-target');
            //loadQuestions(tabId);
        }
        updateDifficultyOptions();
       });

        // 문제 갯수 선택 이벤트 리스너 추가
        const questionCountSelect = document.getElementById('question-count-select');
        questionCountSelect.addEventListener('change', function() {
             const activeTab = document.querySelector('#quizTab .nav-link.active');
             if (activeTab) {
                 const tabId = activeTab.getAttribute('data-bs-target');
                 //loadQuestions(tabId);
             }
        })

                // 난이도 선택 이벤트 리스너 추가
        const difficultySelect = document.getElementById('difficulty-select');
        difficultySelect.addEventListener('change', function() {
             const activeTab = document.querySelector('#quizTab .nav-link.active');
             if (activeTab) {
                 const tabId = activeTab.getAttribute('data-bs-target');
                 //loadQuestions(tabId);
             }
        })
    // 초기 로드 시 객관식 탭의 문제 불러오기
    //loadQuestions('#objective');
    updateDifficultyOptions();
});



// 난이도 선택 제어 함수
function updateDifficultyOptions() {
    const dataSourceSelect = document.getElementById('data-source-select');
    const difficultySelect = document.getElementById('difficulty-select');
    const allOption = difficultySelect.querySelector('option[value="모두"]');

    if (dataSourceSelect.value === 'server') {
        // 서버 선택 시 "모두(시트만)" 옵션 비활성화
        allOption.disabled = true;
        if (difficultySelect.value === '모두') {
            // "모두(시트만)"이 선택된 경우, 다른 값으로 변경 (예: "하")
            difficultySelect.value = '하';
        }
    } else {
        // 스프레드시트 선택 시 "모두(시트만)" 옵션 활성화
        allOption.disabled = false;
    }
}
function loadQuestions(tabId) {
    // 선택된 탭에 따라 API에서 문제를 불러오는 로직을 구현합니다.
    // 예시:

    // 언어 선택 값 가져오기
    const languageSelect = document.getElementById('language-select');
    const language = languageSelect.value;

    // 문제 갯수 선택 값 가져오기
    const questionCountSelect = document.getElementById('question-count-select');
    const questionCount = questionCountSelect.value;

    // 난이도 선택 값 가져오기
    const difficultySelect = document.getElementById('difficulty-select');
    const difficulty = difficultySelect.value;


    console.log('loadQuestions',tabId);
    if(tabId === '#objective'){
        //객관식 문제 불러오기
        fetchQuestions('객관식', language, questionCount,difficulty);
    }else if(tabId === '#short-answer'){
        //단답형 문제 불러오기
        fetchQuestions('단답형', language, questionCount,difficulty);
    }else if(tabId === '#ox'){
        //ox 문제 불러오기
        fetchQuestions('OX 퀴즈', language, questionCount,difficulty);
    }else if(tabId === '#matching'){
        //매칭 문제 불러오기
        fetchQuestions('매칭 퀴즈', language, questionCount,difficulty);
    }else if(tabId === '#mixed'){
        //혼합형 문제 불러오기
        fetchQuestions('혼합형', language, questionCount,difficulty);
    }
}

function fetchQuestions(questionType,language,questionCount,difficulty) {
    // 데이터 소스 선택 값 가져오기
    const dataSourceSelect = document.getElementById('data-source-select');
    const dataSource = dataSourceSelect.value;
    let saveToSheet = false;
    // /let difficulty = null;
    if(dataSource === 'server'){
        saveToSheet = true;
        //difficulty = '중';
    }

    console.log("savetosheet", saveToSheet);
    
    showLoadingIndicator("waiting...");
    fetch('https://sunny-exams.iptime.org:8080/api/questions', {
    //fetch('http://localhost:3000/api/questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            topic: '약학', //약리학에서 약학으로 변경 왜?
            difficulty: difficulty,//'중', 
            question_type: questionType,
            saveToSheet: saveToSheet, // 스프레드시트에 저장하도록 설정
            language: language, // 언어 정보 추가
            questionCount: questionCount, // 문제 갯수 추가
            current_subject: current_subject // 현재 주제 추가
         })
    })
    .then(response => {
        hideLoadingIndicator();
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        hideLoadingIndicator();
        saveQuestionData(data);
        displayQuestions(data, questionType);
    })
    .catch(error => {
        hideLoadingIndicator();
        console.error('Error fetching questions:', error);
    });
}
// 특정 question_id들을 가진 질문들을 가져오는 함수
async function fetchSpecificQuestions(sheetName, questionIds) {
    try {
        showLoadingIndicator("waiting...");
        const response = await fetch('https://sunny-exams.iptime.org:8080/api/get-specific-questions', {
        //const response = await fetch('http://localhost:3000/api/get-specific-questions', {
        
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sheetName, questionIds })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Specific questions:', data);
        // 가져온 데이터를 처리하는 로직 (예: 화면에 표시)
        // ...
        hideLoadingIndicator();
        return data;
    } catch (error) {
        hideLoadingIndicator();
        console.error('Error fetching specific questions:', error);
        return null;
    }
}

function displayQuestions(questions,questionType) {
   // 받은 문제 데이터를 화면에 표시하는 함수
    // 예시:
    
    console.log('displayQuestions',questions,questionType);
    if(questionType =="객관식")
    {
        
        questionType = "objective";
    }
    else if(questionType =="단답형")
    {
        questionType = "short-answer";
    }
    else if(questionType =="OX 퀴즈")
    {
        questionType = "ox";
    }
    else if(questionType =="매칭 퀴즈")
    {
        questionType = "matching";
    }
    else  if(questionType =="혼합형")
    {
        questionType = "mixed";
    }

    const quizAreaId = `${questionType.replace(' ','-').toLowerCase()}-quiz-area`;
    console.log(quizAreaId);
    const quizArea = document.getElementById(quizAreaId);

    if (!quizArea) {
        console.error(`Quiz area not found: ${quizAreaId}`);
        return;
    }
    quizArea.innerHTML = ''; // 기존 내용 초기화
    console.log("qestions");
    console.log(questions);
    if(questionType === 'objective'){
        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('mb-3');
            questionDiv.setAttribute('data-question-id', question.question_id); // data-question-id 추가
            questionDiv.innerHTML = `
                <p>${question.question_text}</p>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-1-${question.question_id}" value="${question.options[0]}">
                    <label class="form-check-label" for="option-1-${question.question_id}">${question.options[0]}</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-2-${question.question_id}" value="${question.options[1]}">
                    <label class="form-check-label" for="option-2-${question.question_id}">${question.options[1]}</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-3-${question.question_id}" value="${question.options[2]}">
                    <label class="form-check-label" for="option-3-${question.question_id}">${question.options[2]}</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-4-${question.question_id}" value="${question.options[3]}">
                    <label class="form-check-label" for="option-4-${question.question_id}">${question.options[3]}</label>
                </div>
            `;
            quizArea.appendChild(questionDiv);
            // 이벤트 리스너 추가
            const radioButtons = questionDiv.querySelectorAll(`input[type="radio"]`);
            radioButtons.forEach(radio => {
                radio.addEventListener('change', () => {
                    checkAnswer(question.question_id);
                });
            });
        });
    }else if(questionType === 'short-answer'){
        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('mb-3');
            questionDiv.setAttribute('data-question-id', question.question_id); // data-question-id 추가
            questionDiv.innerHTML = `
                <p>${question.question_text}</p>
                <input type="text" class="form-control" id="answer-${question.question_id}">
            `;
            quizArea.appendChild(questionDiv);
        });
    }else if(questionType === 'ox'){
        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('mb-3');
            questionDiv.setAttribute('data-question-id', question.question_id); // data-question-id 추가
            questionDiv.innerHTML = `
                <p>${question.question_text}</p>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-o-${question.question_id}" value="O">
                    <label class="form-check-label" for="option-o-${question.question_id}">O</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-x-${question.question_id}" value="X">
                    <label class="form-check-label" for="option-x-${question.question_id}">X</label>
                </div>
            `;
            quizArea.appendChild(questionDiv);
        });
    }else if(questionType === 'matching'){
        
        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('mb-3');
            questionDiv.setAttribute('data-question-id', question.question_id); // data-question-id 추가
            questionDiv.innerHTML = `
                <p>${question.question_text}</p>
                <select class="form-select" id="answer-${question.question_id}">
                    <option value="">선택하세요</option>
                    ${question.options.map(option => `<option value="${option}">${option}</option>`).join('')}
                </select>
            `;
            quizArea.appendChild(questionDiv);
        });
    }else if(questionType === 'mixed'){
        console.log(questions);
        questions.forEach(question => {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('mb-3');
            questionDiv.setAttribute('data-question-id', question.question_id); // data-question-id 추가
            if(question.question_type === 'object' || question.question_type === 'multiple choice'){
                questionDiv.innerHTML = `
                    <p>${question.question_text}</p>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-1-${question.question_id}" value="${question.options[0]}">
                        <label class="form-check-label" for="option-1-${question.question_id}">${question.options[0]}</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-2-${question.question_id}" value="${question.options[1]}">
                        <label class="form-check-label" for="option-2-${question.question_id}">${question.options[1]}</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-3-${question.question_id}" value="${question.options[2]}">
                        <label class="form-check-label" for="option-3-${question.question_id}">${question.options[2]}</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-4-${question.question_id}" value="${question.options[3]}">
                        <label class="form-check-label" for="option-4-${question.question_id}">${question.options[3]}</label>
                    </div>
                `;
            }else if(question.question_type === 'short-answer'){
                questionDiv.innerHTML = `
                    <p>${question.question_text}</p>
                    <input type="text" class="form-control" id="answer-${question.question_id}">
                `;
            }else if(question.question_type === 'OX '){
                questionDiv.innerHTML = `
                    <p>${question.question_text}</p>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-o-${question.question_id}" value="O">
                        <label class="form-check-label" for="option-o-${question.question_id}">O</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="question-${question.question_id}" id="option-x-${question.question_id}" value="X">
                        <label class="form-check-label" for="option-x-${question.question_id}">X</label>
                    </div>
                `;
            }else if(question.question_type === '매칭 퀴즈'){
                questionDiv.innerHTML = `
                    <p>${question.question_text}</p>
                    <select class="form-select" id="answer-${question.question_id}">
                        <option value="">선택하세요</option>
                        ${question.options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                `;
            }
            quizArea.appendChild(questionDiv);
        });
    }
    document.getElementById('submit-button').style.display = 'block';
}

async function updateQuestionStatsInSheet(questionId, isCorrect) {
    try {
        showLoadingIndicator("waiting...");
        const response = await fetch('https://sunny-exams.iptime.org:8080/api/update-question-stats', {
        //const response = await fetch('http://localhost:3000/api/update-question-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_id: questionId,
                is_correct: isCorrect
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Question stats updated:', data);
        hideLoadingIndicator();
        return data;
    } catch (error) {
        hideLoadingIndicator();
        console.error('Error updating question stats:', error);
        return null;
    }
}
function checkAnswer(questionId) {
    console.log('checkAnswer',questionId);
    const questionDiv = document.querySelector(`[data-question-id="${questionId}"]`);
    if (!questionDiv) return false;

    let userAnswer;
    let correctAnswer;
    const questionData = getQuestionData(questionId);
    if(!questionData) return false;
    const questionType = questionData.question_type;

    if (questionType === 'object' || questionType === 'multiple choice') {
        const selectedOption = questionDiv.querySelector(`input[name="question-${questionId}"]:checked`);
        userAnswer = selectedOption ? selectedOption.value : null;
        correctAnswer = questionData.answer;
    } else if (questionType === 'short-answer') {
        userAnswer = questionDiv.querySelector(`#answer-${questionId}`).value.trim();
        correctAnswer = questionData.answer;
    } else if (questionType === 'ox') {
        const selectedOption = questionDiv.querySelector(`input[name="question-${questionId}"]:checked`);
        userAnswer = selectedOption ? selectedOption.value : null;
        correctAnswer = questionData.answer;
    } else if (questionType === 'matching') {
        userAnswer = questionDiv.querySelector(`#answer-${questionId}`).value;
        correctAnswer = questionData.answer;
    }

    if (userAnswer && correctAnswer) {
        if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
            console.log(`문제 ${questionId}: 정답!`);
            return true;
        } else {
            console.log(`문제 ${questionId}: 오답! 정답은 ${correctAnswer} 입니다.`);
            return false;
        }
    }
}
function checkAnswers() {
    console.log('checkAnswers');
    let correctCount = 0;
    let totalCount = Object.keys(questionDataMap).length; // 수정된 부분: questionDataMap의 키 개수를 세어 totalCount를 계산
    console.log("totalCount",totalCount);
    console.log("questionDataMap",questionDataMap);


    for (const key in questionDataMap) {
        // hasOwnProperty를 사용하여 객체 자체의 속성인지 확인하는 것이 좋습니다.
        if (questionDataMap.hasOwnProperty(key)) {
          //const value = questionDataMap[key];
          //console.log(`Key: ${key}, Value: ${value.question_id}`);
        
            if(checkAnswer(key))
            {
                correctCount++;
                updateQuestionStatsInSheet(key, true); // 정답일 경우
            }
            else
            {
                updateQuestionStatsInSheet(key, false); // 오답일 경우
            }

        }
    }
    alert(`총 ${totalCount}문제 중 ${correctCount}문제 정답!`);
    return;
    const questionDivs = document.querySelectorAll('.objective-quiz-area > div, .short-answer-quiz-area > div, .ox-quiz-area > div, .matching-quiz-area > div, .mixed-quiz-area > div');

    questionDivs.forEach(questionDiv => {
        console.log(questionDiv)
        const questionId = questionDiv.getAttribute('data-question-id');
        if (!questionId) return; // questionId가 없으면 다음 문제로 넘어감

        if(checkAnswer(questionId))
        {
            console.log("정답");
        }
        else
        {
            console.log("오답");
        }

        let userAnswer;
        let correctAnswer;


        // const questionData = getQuestionData(questionId);
        // if(!questionData) return;
        // const questionType = questionData.question_type;

        // if (questionType === 'object' || questionType === 'multiple choice') {
        //     const selectedOption = questionDiv.querySelector(`input[name="question-${questionId}"]:checked`);
        //     userAnswer = selectedOption ? selectedOption.value : null;
        //     correctAnswer = questionData.answer;
        // } else if (questionType === 'short-answer') {
        //     userAnswer = questionDiv.querySelector(`#answer-${questionId}`).value.trim();
        //     correctAnswer = questionData.answer;
        // } else if (questionType === 'ox') {
        //     const selectedOption = questionDiv.querySelector(`input[name="question-${questionId}"]:checked`);
        //     userAnswer = selectedOption ? selectedOption.value : null;
        //     correctAnswer = questionData.answer;
        // } else if (questionType === 'matching') {
        //     userAnswer = questionDiv.querySelector(`#answer-${questionId}`).value;
        //     correctAnswer = questionData.answer;
        // }

        // if (userAnswer && correctAnswer) {
        //     if (userAnswer.toLowerCase() === correctAnswer.toLowerCase()) {
        //         correctCount++;
        //     }
        // }
    });

    alert(`총 ${totalCount}문제 중 ${correctCount}문제 정답!`);

    
}
function showLoadingIndicator(title="waiting..   ") {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    
    

    loadingDiv.style.position = 'fixed'; // Cover the whole screen
    loadingDiv.style.top = '0';
    loadingDiv.style.left = '0';
    loadingDiv.style.width = '100%';
    loadingDiv.style.height = '100%';
    loadingDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent background
    loadingDiv.style.display = 'flex';
    loadingDiv.style.justifyContent = 'center';
    loadingDiv.style.alignItems = 'center';
    loadingDiv.style.zIndex = '1000'; // Ensure it's on top
    
    
    const spinner = document.createElement('div'); //You can use any element for this such as <img> with animated gif
    spinner.classList.add('spinner'); // spinner 클래스 추가
    spinner.style.width = '40px';
    spinner.style.height = '40px';
    spinner.style.border = '4px solid #f3f3f3'; /* Light grey */
    spinner.style.borderTop = '4px solid #3498db'; /* Blue */
    spinner.style.borderRadius = '50%';
    spinner.style.animation = 'spin 2s linear infinite'; // Animation for spinning
    
    const loadingText = document.createElement('p');  // New element for text
    loadingText.textContent = title;    // Set the loading text
    loadingText.style.marginTop = '10px'; 
    
    loadingDiv.appendChild(loadingText);
    
    loadingDiv.appendChild(spinner);
    document.body.appendChild(loadingDiv);
    }
    
    // Function to hide the loading indicator
    function hideLoadingIndicator() {
        const loadingDiv = document.getElementById('loading-indicator');
        if (loadingDiv) {
            document.body.removeChild(loadingDiv);
        }
    }

//문제 데이터를 저장할 객체
const questionDataMap = {};

//문제 데이터를 저장하는 함수
function saveQuestionData(questions){
    questions.forEach(question => {
        questionDataMap[question.question_id] = question;
    });
}

//문제 데이터를 가져오는 함수
function getQuestionData(questionId){
    return questionDataMap[questionId];
}

