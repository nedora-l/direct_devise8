import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle } from 'lucide-react'

interface KYCCompletenessProps {
  completeness: number
  requiredDocs: Array<{ type: string; label: string; description: string }>
  uploadedDocs: string[]
  missingDocs: Array<{ type: string; label: string; description: string }>
}

export default function KYCCompleteness({
  completeness,
  requiredDocs,
  uploadedDocs,
  missingDocs
}: KYCCompletenessProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Complétude du Dossier KYC</CardTitle>
          <CardDescription>Progression: {completeness}%</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={completeness} className="h-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground">Documents Uploadés</p>
              <p className="text-2xl font-bold text-accent">{uploadedDocs.length}/6</p>
            </div>
            <div className="p-4 border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground">Restants</p>
              <p className="text-2xl font-bold text-destructive">{missingDocs.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requiredDocs.map(doc => {
              const isUploaded = uploadedDocs.includes(doc.type)
              return (
                <div key={doc.type} className="flex items-center gap-3 p-3 border rounded-lg">
                  {isUploaded ? (
                    <CheckCircle2 className="h-5 w-5 text-accent flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isUploaded ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {doc.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                  </div>
                  {isUploaded && <Badge className="bg-accent">✓ Uploadé</Badge>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {missingDocs.length > 0 && (
        <Card className="border-amber-600">
          <CardHeader>
            <CardTitle className="text-amber-600">Documents Manquants ({missingDocs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {missingDocs.map(doc => (
                <li key={doc.type} className="text-sm text-muted-foreground">
                  • {doc.label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
