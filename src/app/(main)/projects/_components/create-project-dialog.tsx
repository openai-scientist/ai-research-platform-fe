"use client";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProjectMutation } from "@/hooks/use-projects-query";

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: "Project name must be at least 3 characters." })
    .max(80, { message: "Project name must be at most 80 characters." }),
  description: z.string().trim().max(280, { message: "Description must be at most 280 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createProject = useCreateProjectMutation();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }

    onOpenChange(nextOpen);
  };

  async function onSubmit(data: FormValues) {
    try {
      const result = await createProject.mutateAsync(data);
      toast.success(`Project "${data.name}" created.`);
      handleOpenChange(false);
      router.push(`/projects/${result.data.id}`);
    } catch {
      // The shared mutation hook displays the backend error through Sonner.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            toast.error(errors.name?.message ?? errors.description?.message ?? "Please review the project details.");
          })}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>Create a research workspace. You can invite members afterwards.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                  <Input
                    {...field}
                    id="project-name"
                    placeholder="e.g. Protein Folding Study"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5" data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-description">Description</FieldLabel>
                  <Textarea
                    {...field}
                    id="project-description"
                    placeholder="What is this project researching?"
                    rows={3}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>Optional. Shown on the project list.</FieldDescription>
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
