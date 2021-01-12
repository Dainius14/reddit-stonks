$startTime = (Get-Date);
cd backend;
npm start;
cp results.json ../frontend/content;
cd ../frontend;
npm run build;
cd ..;
$endTime = (Get-Date);
Write-Host
Write-Host 'Success' -ForegroundColor Green
Write-Host ('Total time: {0:mm} min {0:ss} sec' -f ($endTime - $startTime) )
