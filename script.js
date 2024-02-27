document.addEventListener('DOMContentLoaded', function () {
    function toggleDisplay(containerId) {
        const container = document.getElementById(containerId);
        if (container.style.display === 'none' || container.style.display === '') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }

    const apiCheckButton = document.getElementById('apiCheckButton');
    if (apiCheckButton) {
        apiCheckButton.addEventListener('click', function() {
            fetchDataAndVisualize('/api-results', 'api-results-intro');
            toggleDisplay('api-results-intro');
        });
    }

    const crawlingCheckButton = document.getElementById('crawlingCheckButton');
    if (crawlingCheckButton) {
        crawlingCheckButton.addEventListener('click', function() {
            fetchDataAndVisualize('/crawling-results', 'crawling-results-intro');
            toggleDisplay('crawling-results-intro');
        });
    }

    const apiDetailsButton = document.getElementById('apiDetailsButton'); // 올바른 id로 수정
    if (apiDetailsButton) {
        apiDetailsButton.addEventListener('click', function() {
            fetchDetailedData('/api-results-detail', 'api-results-detail');
            // toggleDisplay('api-results-detail');
        });
    }

    const crawlingdetailsButton = document.getElementById('crawlingdetailsButton');
    if (crawlingdetailsButton) {
        crawlingdetailsButton.addEventListener('click', function() {
            fetchDetailedData('/crawling-results-detail', 'crawling-results-detail');
            // toggleDisplay('crawling-results-detail');
        });
    }
      
    function loadHomeContent() {
        const today = new Date().toISOString().slice(0, 10);
        Promise.all([
            fetch(`/crawling-results?date=${today}`).then(response => response.json()),
            fetch(`/api-results?date=${today}`).then(response => response.json())
        ]).then(([crawlingData, apiData]) => {
            updateHomeTab(crawlingData); // 기존 크롤링 데이터 처리 함수 호출
            displayApiCheckStatus(apiData); // 새로운 API 데이터 처리 함수 호출
        }).catch(error => {
            console.error('Error:', error);
            document.getElementById('Home').innerHTML = '데이터를 불러오는 데 실패했습니다.';
        });
    }
    
    function updateHomeTab(data) {
        const resultsContainer = document.getElementById('loadHomeContent'); // Assuming 'loadHomeContent' is the ID where the table should be displayed
        const today = new Date().toISOString().slice(0, 10); // Today's date in YYYY-MM-DD format
    
        // Deduplicating data and calculating total downloads
        const uniqueData = [];
        const uniqueKeys = new Set();
        let totalDownloads = 0;
    
        data.forEach(item => {
            const key = `${item['구분']}-${item['데이터명']}-${item['사이트 주소']}`;
            if (!uniqueKeys.has(key) && item['날짜'].slice(0, 10) === today) {
                uniqueData.push(item);
                uniqueKeys.add(key);
                totalDownloads += parseInt(item['다운로드 횟수'], 10); // Summing up the download counts
            }
        });
    
           let content = '<table border="1"><tr><th>구분</th><th>데이터명</th><th>사이트 주소</th><th>날짜</th><th>다운로드 횟수</th></tr>';
        if (uniqueData.length > 0) {
            uniqueData.forEach(item => {
                content += `<tr><td>${item['구분']}</td><td>${item['데이터명']}</td><td>${item['사이트 주소']}</td><td>${item['날짜'].slice(0, 10)}</td><td>${item['다운로드 횟수']}</td></tr>`;
            });
            // Adding total downloads row
            content += `<tr><td colspan="4">금일 기준 총 다운로드 횟수</td><td>${totalDownloads}</td></tr>`;
        } else {
            content += '<tr><td colspan="5">오늘 날짜에 해당하는 데이터가 없습니다.</td></tr>';
        }
        content += '</table>';
    
        resultsContainer.innerHTML = content;
    }

    function displayApiCheckStatus(apiData) {
        const today = new Date().toISOString().slice(0, 10);
        const apiResultsContainer = document.getElementById('apiCheckResults');
        let content = '<h2>API 점검 결과</h2>';
    
                // Group data by service_name
        const groupedByServiceName = apiData.reduce((acc, item) => {
            if (item.check_time.slice(0, 10) === today) {
                if (!acc[item.service_name]) {
                    acc[item.service_name] = [];
                }
                acc[item.service_name].push(item);
            }
            return acc;
        }, {});

        // 서비스에 대해 Check_time 기준으로 최근 날짜 정렬
        Object.keys(groupedByServiceName).forEach(serviceName => {
            const sortedByTime = groupedByServiceName[serviceName].sort((a, b) => new Date(b.check_time) - new Date(a.check_time));
            const mostRecent = sortedByTime[0]; // Most recent entry
            const statusClass = mostRecent.status === '정상' ? 'status-normal' : 'status-error';
            content += `<div class="${statusClass}">${serviceName}: 상태 - ${mostRecent.status}, 점검 시간: ${mostRecent.check_time}</div>`;
        });

        if (content === '<h2>API 점검 결과</h2>') {
            content += '<div>오늘 날짜에 해당하는 데이터가 없습니다.</div>';
        }

        apiResultsContainer.innerHTML = content;
    }

    // 페이지 로드 시 해당 함수 호출
    window.onload = function() {
        loadHomeContent();
        if (document.getElementById("defaultOpen")) {
            document.getElementById("defaultOpen").click();
        }
    };
    
    function fetchDataAndVisualize(apiEndpoint, resultContainerId) {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    document.getElementById(resultContainerId).textContent = '데이터가 없습니다.';
                    return;
                }

                let processedData;
                let dataType;

                if (apiEndpoint.includes('api-results')) {
                    processedData = processApiResults(data);
                    dataType = 'api';
                } else if (apiEndpoint.includes('crawling-results')) {
                    processedData = processCrawlingResults(data);
                    dataType = 'crawling';
                }

                const htmlContent = createHtmlTable(processedData, dataType);
                document.getElementById(resultContainerId).innerHTML = htmlContent;
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                document.getElementById(resultContainerId).textContent = '데이터를 불러오는 데 실패했습니다.';
            });
    }

    function processApiResults(data) {
        let serviceNames = new Set();
        let dates = new Set();
    
        data.forEach(row => {
            serviceNames.add(row.service_name);
            dates.add(row.check_time.split(' ')[0]);
        });
    
        let results = Array.from(serviceNames).map(serviceName => {
            let resultRow = { '서비스명': serviceName };
            Array.from(dates).forEach(date => {
                let latestStatus = data.filter(row => row.service_name === serviceName && row.check_time.startsWith(date))
                                      .sort((a, b) => new Date(b.check_time) - new Date(a.check_time))[0];
                resultRow[date] = latestStatus ? latestStatus.status : '데이터 없음';
            });
            return resultRow;
        });
    
        return { 'dates': Array.from(dates).sort(), 'data': results };
    }
    
    function processCrawlingResults(data) {
        let categories = new Set();
        let dates = new Set();
    
        data.forEach(row => {
            categories.add(row['구분'] + ', ' + row['데이터명'] + ', ' + row['사이트 주소']);
            dates.add(row['날짜'].split(' ')[0]);
        });
    
        let results = Array.from(categories).map(category => {
            let resultRow = { '카테고리': category };
            Array.from(dates).forEach(date => {
                let maxDownloads = data.filter(row => 
                    (row['구분'] + ', ' + row['데이터명'] + ', ' + row['사이트 주소']) === category && 
                    row['날짜'].startsWith(date)
                ).reduce((max, currentRow) => Math.max(max, parseInt(currentRow['다운로드 횟수'])), 0);
                resultRow[date] = maxDownloads || '데이터 없음';
            });
            return resultRow;
        });
    
        return { 'dates': Array.from(dates).sort(), 'data': results };
    }
    
    function createHtmlTable(processedData, dataType) {
        let htmlContent = "<table border='1'>";
    
        // // 날짜 헤더 추가
        // htmlContent += "<tr><th>날짜</th>";
    
        if (dataType === 'api') {
            htmlContent += "<th>서비스명</th>"; // API 데이터의 경우 '서비스명' 헤더 추가
        } else if (dataType === 'crawling') {
            htmlContent += "<th>서비스명</th><th>데이터명</th><th>사이트 주소</th>"; // 크롤링 데이터의 경우 추가적인 헤더 추가
        }
    
        processedData.dates.forEach(date => {
            htmlContent += `<th>${date}</th>`;
        });
        htmlContent += "</tr>";
    
        // 데이터 행 추가
        processedData.data.forEach(row => {
            htmlContent += "<tr>";
    
            if (dataType === 'api') {
                htmlContent += `<td>${row['서비스명']}</td>`; // API 데이터의 경우 '서비스명' 컬럼만 추가
                processedData.dates.forEach(date => {
                    htmlContent += `<td>${row[date] || '데이터 없음'}</td>`;
                });
            } else if (dataType === 'crawling') {
                // 서비스명, 데이터명, 사이트 주소를 별도로 처리
                let categorySplit = row['카테고리'].split(', ');
                htmlContent += `<td>${categorySplit[0]}</td>`; // 서비스명
                htmlContent += `<td>${categorySplit[1]}</td>`; // 데이터명
                htmlContent += `<td>${categorySplit[2]}</td>`; // 사이트 주소
                // 나머지 날짜 데이터 추가
                processedData.dates.forEach(date => {
                    htmlContent += `<td>${row[date] || '데이터 없음'}</td>`;
                });
            }
    
            htmlContent += "</tr>";
        });
    
        htmlContent += "</table>";
        return htmlContent;
    }

    function fetchDetailedData(apiEndpoint, resultContainerId) {
        fetch(apiEndpoint)
            .then(response => response.json())
            .then(data => {
    
                const resultsContainer = document.getElementById(resultContainerId);
                let htmlContent = '<table border="1"><tr>';
    
                let headers;
                if (apiEndpoint.includes('api-results-detail')) {
                    // API 결과에 대한 열 헤더 정의
                    headers = ['연번', 'service_name', 'check_time', 'status'];
                } else if (apiEndpoint.includes('crawling-results-detail')) {
                    // 크롤링 데이터에 대한 열 헤더 정의
                    headers = ['연번', '구분', '데이터명', '사이트 주소', '날짜', '다운로드 횟수'];
                }
    
                headers.forEach(header => {
                    htmlContent += `<th>${header}</th>`;
                });
                htmlContent += '</tr>';
    
                // 테이블 데이터 채우기
                data.forEach((row, index) => {
                    htmlContent += '<tr>';
                    htmlContent += `<td>${index + 1}</td>`; // 연번 추가
    
                    headers.slice(1).forEach(header => { // 첫 번째 열은 연번이므로 제외
                        const cellValue = row[header] ? row[header] : '정보 없음';
                        htmlContent += `<td>${cellValue}</td>`;
                    });
    
                    htmlContent += '</tr>';
                });
    
                htmlContent += '</table>';
                resultsContainer.innerHTML = htmlContent;
            })
            .catch(error => {
                // 오류 로깅
                console.error('데이터 로드 실패. 오류:', error);
                document.getElementById(resultContainerId).textContent = '데이터를 불러오는 데 실패했습니다.';
            });
    }
    
    function openTab(evt, tabName) {
        var tabcontent = document.getElementsByClassName("tabcontent");
        var tablinks = document.getElementsByClassName("tablinks");

        for (var i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        for (var i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }

        var selectedTabContent = document.getElementById(tabName);
        if (selectedTabContent) {
            selectedTabContent.style.display = "block";
        }

        evt.currentTarget.className += " active";
    }



    // 이벤트 리스너를 적절한 탭 버튼에 추가
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById("defaultOpen").click();
    });
});