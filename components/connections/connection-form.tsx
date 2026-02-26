"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, ArrowLeft, Check, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ALL_TYPES,
  SOURCE_TYPES,
  type SourceTypeDef,
  type SourceFieldDef,
} from "@/lib/connections/source-registry";

interface ConnectionFormProps {
  onConnectionAdded: () => void;
}

interface TestResult {
  success: boolean;
  error?: string;
  latencyMs?: number;
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["Type", "Details", "Connect"];

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === current;
        const isComplete = stepNum < current;

        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                className={`h-0.5 flex-1 ${
                  isComplete ? "bg-black dark:bg-white" : "bg-neutral-300 dark:bg-neutral-600"
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center size-6 border-2 text-xs font-bold ${
                  isActive || isComplete
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-neutral-300 text-neutral-400 dark:border-neutral-600 dark:text-neutral-500"
                }`}
              >
                {isComplete ? <Check className="size-3" /> : stepNum}
              </div>
              <span
                className={`text-xs font-bold uppercase tracking-tight ${
                  isActive || isComplete
                    ? "text-black dark:text-white"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function TypeSelectorGrid({
  onSelect,
}: {
  onSelect: (type: string) => void;
}) {
  return (
    <div>
      <h3 className="font-black text-lg uppercase tracking-tight mb-4">
        Select Source Type
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {ALL_TYPES.map((source) => {
          const isBatch1 = source.batch === 1;

          return (
            <button
              key={source.id}
              type="button"
              disabled={!isBatch1}
              onClick={() => isBatch1 && onSelect(source.id)}
              className={`relative text-left p-4 border-2 border-black dark:border-white transition-[transform,box-shadow,background-color,color] ${
                isBatch1
                  ? "bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
                  : "opacity-50 pointer-events-none bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <Database className="size-5 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-sm uppercase tracking-tight">
                    {source.displayName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {source.description}
                  </div>
                </div>
              </div>
              {!isBatch1 && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-[10px]">
                    Coming soon
                  </Badge>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConnectionDetailsStep({
  selectedType,
  name,
  setName,
  connectionParams,
  setConnectionParams,
  onBack,
  onContinue,
}: {
  selectedType: SourceTypeDef;
  name: string;
  setName: (name: string) => void;
  connectionParams: Record<string, string | number>;
  setConnectionParams: React.Dispatch<
    React.SetStateAction<Record<string, string | number>>
  >;
  onBack: () => void;
  onContinue: () => void;
}) {
  const handleFieldChange = (fieldName: string, value: string | number) => {
    setConnectionParams((prev) => ({ ...prev, [fieldName]: value }));
  };

  const allRequiredFilled =
    name.trim() !== "" &&
    selectedType.fields
      .filter((f) => f.required)
      .every((f) => {
        const val = connectionParams[f.name];
        return val !== undefined && val !== "";
      });

  return (
    <div>
      <h3 className="font-black text-lg uppercase tracking-tight mb-1">
        Connection Details
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Configure your {selectedType.displayName} connection
      </p>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="connection-name"
            className="text-sm font-bold uppercase tracking-tight"
          >
            Connection Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="connection-name"
            type="text"
            placeholder="My database..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="h-px bg-neutral-200 dark:bg-neutral-700" />

        {selectedType.fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={connectionParams[field.name] ?? ""}
            onChange={(val) => handleFieldChange(field.name, val)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!allRequiredFilled}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: SourceFieldDef;
  value: string | number;
  onChange: (value: string | number) => void;
}) {
  const inputId = `field-${field.name}`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-bold uppercase tracking-tight">
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </label>

      {field.type === "select" ? (
        <select
          id={inputId}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="flex h-9 w-full border-2 border-black bg-transparent px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-white dark:focus-visible:ring-white"
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={inputId}
          type={field.type}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) =>
            onChange(
              field.type === "number"
                ? e.target.value === ""
                  ? ""
                  : Number(e.target.value)
                : e.target.value
            )
          }
          required={field.required}
        />
      )}

      {field.helpText && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
}

function TestAndSaveStep({
  selectedType,
  name,
  connectionParams,
  testResult,
  isTesting,
  isSubmitting,
  onTest,
  onSave,
  onBack,
}: {
  selectedType: SourceTypeDef;
  name: string;
  connectionParams: Record<string, string | number>;
  testResult: TestResult | null;
  isTesting: boolean;
  isSubmitting: boolean;
  onTest: () => void;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h3 className="font-black text-lg uppercase tracking-tight mb-1">
        Test & Save
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Verify your connection before saving
      </p>

      <div className="border-2 border-black dark:border-white p-4 mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
            Type
          </span>
          <Badge variant="outline">{selectedType.displayName}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
            Name
          </span>
          <span className="text-sm font-medium">{name}</span>
        </div>
        {connectionParams.host && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
              Host
            </span>
            <span className="text-sm font-medium">
              {String(connectionParams.host)}
              {connectionParams.port ? `:${connectionParams.port}` : ""}
            </span>
          </div>
        )}
        {connectionParams.database && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
              Database
            </span>
            <span className="text-sm font-medium">
              {String(connectionParams.database)}
            </span>
          </div>
        )}
      </div>

      {testResult && (
        <div
          className={`flex items-start gap-2 border-2 p-3 mb-4 ${
            testResult.success
              ? "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200 dark:border-green-400"
              : "border-destructive bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200 dark:border-red-400"
          }`}
        >
          {testResult.success ? (
            <Check className="size-4 mt-0.5 shrink-0" />
          ) : (
            <X className="size-4 mt-0.5 shrink-0" />
          )}
          <span className="text-sm font-medium">
            {testResult.success
              ? `Connected successfully${testResult.latencyMs !== undefined ? ` (${testResult.latencyMs}ms)` : ""}`
              : testResult.error ?? "Connection failed"}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTest}
            disabled={isTesting || isSubmitting}
          >
            {isTesting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={!testResult?.success || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Connection"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConnectionForm({ onConnectionAdded }: ConnectionFormProps) {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [connectionParams, setConnectionParams] = React.useState<
    Record<string, string | number>
  >({});
  const [testResult, setTestResult] = React.useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const sourceTypeDef = selectedType ? SOURCE_TYPES[selectedType] : null;

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    setTestResult(null);

    // Pre-populate default values from the source type fields
    const typeDef = SOURCE_TYPES[typeId];
    const defaults: Record<string, string | number> = {};
    for (const field of typeDef.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      }
    }
    setConnectionParams(defaults);
    setStep(2);
  };

  const handleBack = (targetStep: number) => {
    if (targetStep === 1) {
      setTestResult(null);
    }
    setStep(targetStep);
  };

  const handleTest = async () => {
    if (!selectedType) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          connectionParams,
        }),
      });

      const data: TestResult = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Network error: could not reach server" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedType || !name.trim()) return;

    setIsSubmitting(true);

    try {
      const typeDef = SOURCE_TYPES[selectedType];
      const connectionUri = typeDef.buildConnectionUri
        ? typeDef.buildConnectionUri(connectionParams)
        : undefined;

      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: selectedType,
          connectionParams,
          connectionUri: connectionUri ?? undefined,
        }),
      });

      if (res.ok) {
        const data: { databaseDocId?: string } = await res.json();
        onConnectionAdded();
        if (data.databaseDocId) {
          router.push(`/catalog/${data.databaseDocId}`);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-2 border-black dark:border-white bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <StepIndicator current={step} />

      {step === 1 && <TypeSelectorGrid onSelect={handleTypeSelect} />}

      {step === 2 && sourceTypeDef && (
        <ConnectionDetailsStep
          selectedType={sourceTypeDef}
          name={name}
          setName={setName}
          connectionParams={connectionParams}
          setConnectionParams={setConnectionParams}
          onBack={() => handleBack(1)}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && sourceTypeDef && (
        <TestAndSaveStep
          selectedType={sourceTypeDef}
          name={name}
          connectionParams={connectionParams}
          testResult={testResult}
          isTesting={isTesting}
          isSubmitting={isSubmitting}
          onTest={handleTest}
          onSave={handleSave}
          onBack={() => handleBack(2)}
        />
      )}
    </div>
  );
}
