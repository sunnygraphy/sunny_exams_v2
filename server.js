require('dotenv').config({ path: './.env' }); // config 폴더 안에 .env 파일이 있는 경우
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');


const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid'); // UUID 라이브러리 추가
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Replace with your actual API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_API_KEY); // Replace with your actual API key
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Google Sheets API 설정
const serviceAccountKeyFile = './host-pharmacy-d6b5f7e76a65.json'; // 서비스 계정 키 파일 경로
const pharmacy_spreadsheetId = '17kygG8CJaanMl2QU-lU8gmkmP5KmTT7UZgpY_HcOZx8'; //약학학 스프레드시트 ID
const chemistry_spreadsheetId = '13fvyZV93zjOxttGYUuARsgO55JtCrzpg3NEJc4EBfG0'; //화학 스프레드시트 ID
const physical_spreadsheetId = '1M5RP9Q7QFSdxulczAxlD7zZmOycLU_hcr1UbmMXwctg' ; //물리 
let spreadsheetId = pharmacy_spreadsheetId;

const sheetNames = {
    '객관식': 'objective',
    '단답형': 'short-answer',
    'OX 퀴즈': 'ox',
    '매칭 퀴즈': 'matching',
    '혼합형': 'mixed'
}; // 시트 이름

// Google Sheets API 인증
const auth = new JWT({
    keyFile: serviceAccountKeyFile,
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets', // **This is the crucial change: added write access**
        //'https://www.googleapis.com/auth/spreadsheets.readonly' // You can remove this line as it's included in the above scope
    ],
});

const sheets = google.sheets({ version: 'v4', auth });

// 스프레드시트에서 데이터 읽어오는 함수
async function getQuestionsFromSheet(sheetName,questionCount,difficulty) {
    console.log("getQuestionsFromSheet");
    try {
        const range = `${sheetName}!A:G`; // A:G 열만 가져오도록 수정
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found.');
            return [];
        }

        console.log("rows (A:G):");
        console.log(rows);
        // 첫 번째 행이 헤더가 아니므로, 바로 데이터로 처리
        const headers = ["question_id", "date", "last date", "difficulty", "wrong_count", "correct_count", "total_count"]; // 예상되는 헤더를 직접 정의
        const data = rows.map(row => {
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = row[index] || ""; // 값이 없을 경우 빈 문자열로 처리
            });
            return rowData;
        });

        // 난이도 필터링
        let filteredData = data;
        if (difficulty !== "모두") {
            filteredData = data.filter(item => item.difficulty === difficulty);
        }

        // 문제 갯수만큼 question_id 추출
        //const limitedData = filteredData.slice(0, questionCount);
        
          // --- 수정된 부분 시작 ---
        // 랜덤하게 n개 가져오기
        const shuffled = filteredData.slice().sort(() => 0.5 - Math.random()); // 데이터를 섞음
        let limitedData = shuffled.slice(0, questionCount); // 섞인 데이터에서 요청한 개수만큼 잘라 반환

        // 요청한 개수가 전체 데이터 개수보다 많거나 같으면 전체 데이터를 반환
        if (questionCount >= filteredData.length) {
          limitedData = filteredData;
        }
        // --- 수정된 부분 끝 ---
        const questionIds = limitedData.map(item => item.question_id);

        console.log("*********questionIds:", questionIds);

        // question_id에 맞는 전체 행 데이터 가져오기
        const fullQuestions = await getSpecificQuestionsFromSheet(sheetName, questionIds);

        return fullQuestions;

    } catch (err) {
        console.error('The API returned an error:', err);
        return [];
    }
}

async function findRowByQuestionId(sheetName, questionId) {
    try {
        const range = `${sheetName}!A:A`; // question_id가 있는 A열만 검색
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found.');
            return -1; // 데이터가 없으면 -1 반환
        }

        // question_id를 찾아서 행 번호 반환 (1부터 시작)
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === questionId) {
                return i + 1; // 행 번호는 1부터 시작
            }
        }

        return -1; // question_id를 찾지 못하면 -1 반환
    } catch (err) {
        console.error('Error finding row by question_id:', err);
        return -1;
    }
}

// 스프레드시트에서 특정 행의 데이터를 업데이트하는 함수
async function updateQuestionStats(sheetName, rowNumber, wrongCount, correctCount, totalCount,lastDate) {
    try {
        const range = `${sheetName}!C${rowNumber}:F${rowNumber}`; // C, D, E 열 업데이트
        const values = [[lastDate,wrongCount, correctCount, totalCount]];

        const resource = {
            values,
        };

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource,
        });

        console.log(`${response.data.updatedCells} cells updated.`);
        return response.data;
    } catch (err) {
        console.error('Error updating question stats:', err);
        return null;
    }
}
// 특정 question_id들을 가진 행들만 시트에서 가져오는 함수
async function getSpecificQuestionsFromSheet(sheetName, questionIds) {
    console.log("getSpecificQuestionsFromSheet");
    try {
        // question_id에 해당하는 행 번호 찾기
        const rowNumbers = await Promise.all(questionIds.map(async questionId => {
            return await findRowByQuestionId(sheetName, questionId);
        }));

        // 유효한 행 번호만 필터링
        const validRowNumbers = rowNumbers.filter(rowNumber => rowNumber !== -1);

        // 개별 범위 생성
        const ranges = validRowNumbers.map(rowNumber => `${sheetName}!A${rowNumber}:Z${rowNumber}`);

        // batchGet을 사용하여 여러 범위 가져오기
        const fullResponse = await sheets.spreadsheets.values.batchGet({
            spreadsheetId,
            ranges: ranges,
        });

        const fullRows = fullResponse.data.valueRanges.flatMap(valueRange => valueRange.values);

        if (!fullRows || fullRows.length === 0) {
            console.log('No data found in full range.');
            return [];
        }

        // 전체 데이터 가공
        const headers = ["question_id", "date", "last date", "difficulty", "wrong_count", "correct_count", "total_count", "question_type", "question_text", "options", "answer"];
        const fullData = fullRows.map(row => {
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = row[index] || "";
            });
            return rowData;
        });

        // 데이터 가공 (question_type, options, answer)
        const processedData = fullData.map(item => {
            const processedItem = { ...item };

            // question_type 가공
            if (item.question_type === "multiple choice") {
                processedItem.question_type = "object";
            }
            // options 가공
            if (item.options) {
                try {
                    processedItem.options = JSON.parse(item.options);
                } catch (e) {
                    console.error("Error parsing options:", e);
                    processedItem.options = [];
                }
            }
            //answer 가공
            if (item.answer) {
                processedItem.answer = item.answer;
            }

            return processedItem;
        });

        return processedData;
    } catch (err) {
        console.error('The API returned an error:', err);
        return [];
    }
}
// 스프레드시트에 데이터 추가하는 함수
async function appendQuestionsToSheet(sheetName, questions) {
    try {
        const range = `${sheetName}!A:Z`;
        const values = questions.map(question => {
            const today = new Date().toISOString().split('T')[0]; 
            return [
                question.question_id,
                today, // 날짜 추가,
                today, // last date 추가
                question.difficulty, // 난이도 추가
                0,     // 틀린 횟수 초기값
                0,     // 맞은 횟수 초기값
                0,      // 전체 횟수 초기값
                question.question_type,
                question.question_text,
                question.options ? JSON.stringify(question.options) : '', // 옵션은 JSON 문자열로 저장
                question.answer
            ];
        });

        const resource = {
            values,
        };

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource,
        });

        console.log(`${response.data.updates.updatedCells} cells appended.`);
        return response.data;
    } catch (err) {
        console.error('The API returned an error:', err);
        return null;
    }
}
// 문제 통계 업데이트 API 엔드포인트
app.post('/api/update-question-stats', async (req, res) => {
    const { question_id, is_correct } = req.body;
    console.log("update-question-stats",question_id,is_correct);
    if (!question_id) {
        return res.status(400).json({ error: 'question_id is required' });
    }

    try {
        // question_id에 해당하는 시트 이름 찾기
        let sheetName = null;
        for (const key in sheetNames) {
            const rowNumber = await findRowByQuestionId(sheetNames[key], question_id);
            if (rowNumber !== -1) {
                sheetName = sheetNames[key];
                break;
            }
        }

        if (!sheetName) {
            return res.status(404).json({ error: 'question_id not found in any sheet' });
        }

        const rowNumber = await findRowByQuestionId(sheetName, question_id);
        if (rowNumber === -1) {
            return res.status(404).json({ error: 'question_id not found' });
        }

        // 기존 데이터 읽어오기
        const range = `${sheetName}!C${rowNumber}:F${rowNumber}`;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        const rowData = response.data.values[0];
        //let lastDate = rowData[0] || "";
        let wrongCount = parseInt(rowData[1]) || 0;
        let correctCount = parseInt(rowData[2]) || 0;
        let totalCount = parseInt(rowData[3]) || 0;

        // 통계 업데이트
        totalCount++;
        if (is_correct) {
            correctCount++;
        } else {
            wrongCount++;
        }

         // 현재 날짜를 가져옴
         const today = new Date().toISOString().split('T')[0];
        // 스프레드시트에 업데이트
        await updateQuestionStats(sheetName, rowNumber, wrongCount, correctCount, totalCount,today);

        res.json({ message: 'Question stats updated successfully' });
    } catch (error) {
        console.error('Error updating question stats:', error);
        res.status(500).json({ error: 'Failed to update question stats' });
    }
});
// 예시 API 엔드포인트 (필요에 따라 수정)
app.post('/api/get-specific-questions', async (req, res) => {
    const { sheetName, questionIds } = req.body;

    if (!sheetName || !questi/api/get-specific-questionsonIds || !Array.isArray(questionIds)) {
        return res.status(400).json({ error: 'sheetName and questionIds (array) are required' });
    }

    try {
        const questions = await getSpecificQuestionsFromSheet(sheetName, questionIds);
        res.json(questions);
    } catch (error) {
        console.error('Error getting specific questions:', error);
        res.status(500).json({ error: 'Failed to get specific questions' });
    }
});
app.post('/api/questions', async (req, res) => {
    console.log('Received POST request to /api/questions');
    console.log('Request body:', req.body);

    const { topic, difficulty, question_type, saveToSheet ,language,questionCount,current_subject} = req.body;
    console.log('topic:', topic);
    console.log('difficulty:????', difficulty);
    console.log('question_type:', question_type);
    if(current_subject === "약학"){
        spreadsheetId = pharmacy_spreadsheetId;
    }else if(current_subject === "화학"){
        spreadsheetId = chemistry_spreadsheetId;
    }else if(current_subject === "물리"){
        spreadsheetId = physical_spreadsheetId;
    }
    // Check if we should generate questions with Gemini
    if (topic && difficulty && question_type && saveToSheet) {
        try {
            const generatedQuestions = await generateQuestionsWithGemini(topic, difficulty, question_type,language,questionCount,current_subject);
            console.log('generatedQuestions:', generatedQuestions);
            console.log("-------", question_type, saveToSheet);
            if (question_type === '객관식' && saveToSheet) {
                const sheetName = sheetNames[question_type];
                if (sheetName) {
                    await appendQuestionsToSheet(sheetName, generatedQuestions);
                    console.log('Questions appended to sheet.');
                }
            }
            res.json(generatedQuestions);
        } catch (error) {
            console.error('Error generating questions with Gemini:', error);
            res.status(500).json({ error: 'Failed to generate questions' });
        }
    } else {
        // 스프레드시트에서 데이터 가져오기
        console.log('Fetching questions from sheet...');
        const sheetName = sheetNames[question_type];
        if (!sheetName) {
            return res.status(400).json({ error: 'Invalid question type' });
        }

        const questions = await getQuestionsFromSheet(sheetName,questionCount,difficulty);
        console.log('questions from sheet:', questions);
        res.json(questions);
    }
});

// Function to generate questions with Gemini
// async function generateQuestionsWithGemini(topic, difficulty, question_type,language,questionCount) {
//     let prompt = ``;
//     if (language === 'ko') {
//         prompt = `다음 주제에 대해 ${difficulty} 난이도의 ${question_type} 문제 ${questionCount}개를 한국어로 생성해주세요: ${topic}.
//         정답을 제공해주세요.
//         객관식인 경우 선택지를 제공해주세요.
//         문제 유형(question_type)을 제공해주세요.
//         문제 텍스트(question_text)를 제공해주세요.
//         정답(answer)을 제공해주세요.
//         객관식인 경우 선택지(options)를 제공해주세요.
//         출력은 JSON 객체의 배열 형식으로 해주세요. 각 객체는 다음 키를 가져야 합니다: question_id, question_type, question_text, options (해당하는 경우), answer.
//         마크다운 코드 블록 구문은 사용하지 마세요.
//         객관식 문제의 예시:
//         [
//           {
//               "question_id": "UUID",
//               "question_type": "multiple choice",
//               "question_text": "고혈압과 울혈성 심부전 병력이 있는 65세 남성 환자에게 새로운 약물이 처방되었습니다. 첫 투여 후 심각한 기립성 저혈압을 경험합니다. 다음 중 이 부작용을 일으킬 가능성이 가장 높은 약물 계열은 무엇입니까?",
//               "options": [
//                   "베타 차단제",
//                   "ACE 억제제",
//                   "칼슘 채널 차단제 (디하이드로피리딘)",
//                   "안지오텐신 수용체 차단제 (ARB)",
//                   "이뇨제 (티아지드)"
//               ],
//               "answer": "ACE 억제제"
//           },
//           {
//               "question_id": "UUID",
//               "question_type": "multiple choice",
//               "question_text": "환자가 약물을 갑자기 중단한 후 떨림, 불안, 빈맥을 경험하고 있습니다. 다음 중 가장 가능성이 높은 금단 증후군은 무엇입니까?",
//               "options": [
//                   "오피오이드 금단",
//                   "벤조디아제핀 금단",
//                   "알코올 금단",
//                   "니코틴 금단",
//                   "자극제 금단"
//               ],
//               "answer": "벤조디아제핀 금단"
//           }
//         ]
//         `;
//     } else if (language === 'en') {
//         prompt = `Generate ${questionCount} ${question_type} questions about ${topic} with ${difficulty} difficulty.
//         Please provide the answer.
//         Please provide the options if it is multiple choice.
//         Please provide the question_type.
//         Please provide the question_text.
//         Please provide the answer.
//         Please provide the options if it is multiple choice.
//         Format the output as a JSON array of objects. Each object should have the following keys: question_id, question_type, question_text, options (if applicable), and answer.
//         Do not use markdown code block syntax.
//         Example of multiple choice :
//         [
//           {
//               "question_id": "UUID",
//               "question_type": "multiple choice",
//               "question_text": "A 65-year-old male patient with a history of hypertension and congestive heart failure is prescribed a new medication.  He experiences significant orthostatic hypotension after the first dose. Which of the following classes of drugs is MOST likely responsible for this side effect?",
//               "options": [
//                   "Beta-blockers",
//                   "ACE inhibitors",
//                   "Calcium channel blockers (dihydropyridines)",
//                   "Angiotensin receptor blockers (ARBs)",
//                   "Diuretics (thiazide)"
//               ],
//               "answer": "ACE inhibitors"
//           },
//           {
//               "question_id": "UUID",
//               "question_type": "multiple choice",
//               "question_text": "A patient is experiencing tremors, anxiety, and tachycardia after abruptly discontinuing a medication. Which of the following withdrawal syndromes is MOST likely?",
//               "options": [
//                   "Opioid withdrawal",
//                   "Benzodiazepine withdrawal",
//                   "Alcohol withdrawal",
//                   "Nicotine withdrawal",
//                   "Stimulant withdrawal"
//               ],
//               "answer": "Benzodiazepine withdrawal"
//           }
//         ]
//         `;
//     }

//     try {
//         const result = await model.generateContent(prompt);
//         const response = await result.response;
//         const text = response.text();
//         console.log("Gemini Response:");
//         console.log(text);

//         // Remove markdown code block delimiters if present
//         const jsonString = text.replace(/```(json)?\n?([\s\S]*?)```/g, '$2').trim();

//         const questions = JSON.parse(jsonString);
//         console.log("Parsed Questions: ", questions);
//         console.log(questions);
//         // 각 문제에 UUID 할당
//         const questionsWithUUID = questions.map(question => {
//             return {
//                 ...question,
//                 question_id: uuidv4(), // UUID 생성하여 할당
//                 difficulty: question.difficulty || difficulty // 난이도가 없으면 기본 난이도 사용
//             };
//         });

//         return questionsWithUUID;
//     } catch (error) {
//         console.error("Error generating or parsing Gemini response:", error);
//         return [];
//     }
// }

async function generateQuestionsWithGemini(topic, difficulty, question_type,language,questionCount,current_subject) {
    let prompt = ``;
    let subject_description = "";

    switch (current_subject) {
        case '약학':
            subject_description = "약학";
            break;
        case '화학':
            subject_description = "화학";
            break;
        case '물리':
            subject_description = "물리";
            break;
        default:
            subject_description = "약학";
            break;
    }

    console.log("*************",subject_description);
    if (language === 'ko') {
        prompt = `다음 주제에 대해 ${difficulty} 난이도의 ${question_type} 문제 ${questionCount}개를 한국어로 생성해주세요: ${topic}.
        주제는 ${subject_description}입니다.
        정답을 제공해주세요.
        객관식인 경우 선택지를 제공해주세요.
        문제 유형(question_type)을 제공해주세요.
        문제 텍스트(question_text)를 제공해주세요.
        정답(answer)을 제공해주세요.
        객관식인 경우 선택지(options)를 제공해주세요.
        출력은 JSON 객체의 배열 형식으로 해주세요. 각 객체는 다음 키를 가져야 합니다: question_id, question_type, question_text, options (해당하는 경우), answer.
        마크다운 코드 블록 구문은 사용하지 마세요.`;

        if(subject_description === "약학"){
            prompt += `
            객관식 문제의 예시:
            [
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "고혈압과 울혈성 심부전 병력이 있는 65세 남성 환자에게 새로운 약물이 처방되었습니다. 첫 투여 후 심각한 기립성 저혈압을 경험합니다. 다음 중 이 부작용을 일으킬 가능성이 가장 높은 약물 계열은 무엇입니까?",
                  "options": [
                      "베타 차단제",
                      "ACE 억제제",
                      "칼슘 채널 차단제 (디하이드로피리딘)",
                      "안지오텐신 수용체 차단제 (ARB)",
                      "이뇨제 (티아지드)"
                  ],
                  "answer": "ACE 억제제"
              },
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "환자가 약물을 갑자기 중단한 후 떨림, 불안, 빈맥을 경험하고 있습니다. 다음 중 가장 가능성이 높은 금단 증후군은 무엇입니까?",
                  "options": [
                      "오피오이드 금단",
                      "벤조디아제핀 금단",
                      "알코올 금단",
                      "니코틴 금단",
                      "자극제 금단"
                  ],
                  "answer": "벤조디아제핀 금단"
              }
            ]
            `;
        }else if(subject_description === "화학"){
            prompt += `
            객관식 문제의 예시:
            [
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "다음 중 산화-환원 반응이 아닌 것은 무엇입니까?",
                  "options": [
                      "연소 반응",
                      "중화 반응",
                      "부식 반응",
                      "광합성 반응"
                  ],
                  "answer": "중화 반응"
              },
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "다음 중 가장 강한 산은 무엇입니까?",
                  "options": [
                      "아세트산",
                      "염산",
                      "탄산",
                      "인산"
                  ],
                  "answer": "염산"
              }
            ]
            `;
        }else if(subject_description === "물리"){
            prompt += `
            객관식 문제의 예시:
            [
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "다음 중 운동 에너지에 대한 설명으로 옳은 것은 무엇입니까?",
                  "options": [
                      "정지한 물체에 저장된 에너지",
                      "움직이는 물체가 가진 에너지",
                      "물체의 위치에 따른 에너지",
                      "물체의 질량에만 의존하는 에너지"
                  ],
                  "answer": "움직이는 물체가 가진 에너지"
              },
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "다음 중 빛의 굴절 현상을 가장 잘 설명하는 것은 무엇입니까?",
                  "options": [
                      "빛이 거울에 반사되는 현상",
                      "빛이 다른 매질로 진행할 때 방향이 바뀌는 현상",
                      "빛이 물체를 통과하지 못하는 현상",
                      "빛이 물체에 흡수되는 현상"
                  ],
                  "answer": "빛이 다른 매질로 진행할 때 방향이 바뀌는 현상"
              }
            ]
            `;
        }
    } else if (language === 'en') {
        prompt = `Generate ${questionCount} ${question_type} questions about ${topic} with ${difficulty} difficulty. The topic is ${subject_description}.
        Please provide the answer.
        Please provide the options if it is multiple choice.
        Please provide the question_type.
        Please provide the question_text.
        Please provide the answer.
        Please provide the options if it is multiple choice.
        Format the output as a JSON array of objects. Each object should have the following keys: question_id, question_type, question_text, options (if applicable), and answer.
        Do not use markdown code block syntax.`;

        if(subject_description === "약학"){
            prompt += `
            Example of multiple choice :
            [
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "A 65-year-old male patient with a history of hypertension and congestive heart failure is prescribed a new medication.  He experiences significant orthostatic hypotension after the first dose. Which of the following classes of drugs is MOST likely responsible for this side effect?",
                  "options": [
                      "Beta-blockers",
                      "ACE inhibitors",
                      "Calcium channel blockers (dihydropyridines)",
                      "Angiotensin receptor blockers (ARBs)",
                      "Diuretics (thiazide)"
                  ],
                  "answer": "ACE inhibitors"
              },
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "A patient is experiencing tremors, anxiety, and tachycardia after abruptly discontinuing a medication. Which of the following withdrawal syndromes is MOST likely?",
                  "options": [
                      "Opioid withdrawal",
                      "Benzodiazepine withdrawal",
                      "Alcohol withdrawal",
                      "Nicotine withdrawal",
                      "Stimulant withdrawal"
                  ],
                  "answer": "Benzodiazepine withdrawal"
              }
            ]
            `;
        }else if(subject_description === "화학"){
            prompt += `
            Example of multiple choice :
            [
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "Which of the following is NOT a redox reaction?",
                  "options": [
                      "Combustion reaction",
                      "Neutralization reaction",
                      "Corrosion reaction",
                      "Photosynthesis reaction"
                  ],
                  "answer": "Neutralization reaction"
              },
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "Which of the following is the strongest acid?",
                  "options": [
                      "Acetic acid",
                      "Hydrochloric acid",
                      "Carbonic acid",
                      "Phosphoric acid"
                  ],
                  "answer": "Hydrochloric acid"
              }
            ]
            `;
        }else if(subject_description === "물리"){
            prompt += `
            Example of multiple choice :
            [
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "Which of the following correctly describes kinetic energy?",
                  "options": [
                      "Energy stored in a stationary object",
                      "Energy possessed by a moving object",
                      "Energy based on an object's position",
                      "Energy that depends only on an object's mass"
                  ],
                  "answer": "Energy possessed by a moving object"
              },
              {
                  "question_id": "UUID",
                  "question_type": "multiple choice",
                  "question_text": "Which of the following best explains the phenomenon of light refraction?",
                  "options": [
                      "The reflection of light off a mirror",
                      "The change in direction of light as it passes into a different medium",
                      "The inability of light to pass through an object",
                      "The absorption of light by an object"
                  ],
                  "answer": "The change in direction of light as it passes into a different medium"
              }
            ]
            `;
        }
    }

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini Response:");
        console.log(text);

        // Remove markdown code block delimiters if present
        const jsonString = text.replace(/```(json)?\n?([\s\S]*?)```/g, '$2').trim();

        const questions = JSON.parse(jsonString);
        console.log("Parsed Questions: ", questions);
        console.log(questions);
        // 각 문제에 UUID 할당
        const questionsWithUUID = questions.map(question => {
            return {
                ...question,
                question_id: uuidv4(), // UUID 생성하여 할당
                difficulty: question.difficulty || difficulty // 난이도가 없으면 기본 난이도 사용
            };
        });

        return questionsWithUUID;
    } catch (error) {
        console.error("Error generating or parsing Gemini response:", error);
        return [];
    }
}


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
