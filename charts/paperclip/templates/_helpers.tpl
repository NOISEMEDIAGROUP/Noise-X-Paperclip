{{/*
Expand the name of the chart.
*/}}
{{- define "paperclip.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "paperclip.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "paperclip.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "paperclip.labels" -}}
helm.sh/chart: {{ include "paperclip.chart" . }}
{{ include "paperclip.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "paperclip.selectorLabels" -}}
app.kubernetes.io/name: {{ include "paperclip.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use.
*/}}
{{- define "paperclip.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "paperclip.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Return the appropriate DATABASE_URL.
Priority: (1) subchart postgresql, (2) externalDatabase composed URL, (3) literal secrets.databaseUrl
*/}}
{{- define "paperclip.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- $host := printf "%s-postgresql" (include "paperclip.fullname" .) }}
{{- $port := 5432 }}
{{- $user := .Values.postgresql.auth.username | default "paperclip" }}
{{- $password := .Values.postgresql.auth.password | default "paperclip" }}
{{- $database := .Values.postgresql.auth.database | default "paperclip" }}
{{- printf "postgres://%s:%s@%s:%v/%s" $user $password $host $port $database }}
{{- else if .Values.externalDatabase.host }}
{{- $host := .Values.externalDatabase.host }}
{{- $port := .Values.externalDatabase.port | default 5432 }}
{{- $user := .Values.externalDatabase.user | default "paperclip" }}
{{- $password := .Values.externalDatabase.password | default "" }}
{{- $database := .Values.externalDatabase.database | default "paperclip" }}
{{- printf "postgres://%s:%s@%s:%v/%s" $user $password $host $port $database }}
{{- else }}
{{- .Values.secrets.databaseUrl | default "" }}
{{- end }}
{{- end }}

{{/*
Return the name of the secret to use.
*/}}
{{- define "paperclip.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- include "paperclip.fullname" . }}
{{- end }}
{{- end }}
