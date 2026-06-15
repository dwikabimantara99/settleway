$files = Get-ChildItem -Path "web/src/app/api/deals" -Recurse -Filter "*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $newContent = $content -replace "import \{ mockStore \} from '@/lib/db/mock-store';", "import { repository } from '@/lib/repositories';"
    $newContent = $newContent -replace "mockStore\.deals\.get\(dealId\)", "await repository.getDeal(dealId)"
    $newContent = $newContent -replace "mockStore\.updateDeal\(dealId, updatedDeal\)", "await repository.updateDeal(dealId, updatedDeal)"
    $newContent = $newContent -replace "mockStore\.addEvent\(event\)", "await repository.addEvent(event)"
    $newContent = $newContent -replace "mockStore\.addEvidence\(verifyRes\.evidence!\)", "await repository.addEvidence(verifyRes.evidence!)"
    $newContent = $newContent -replace "processReputationOutcome\(mockStore,", "await processReputationOutcome(repository,"
    
    # Write back
    Set-Content -Path $file.FullName -Value $newContent
}
