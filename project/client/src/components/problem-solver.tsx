import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertProblemSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Image as ImageIcon } from "lucide-react";
import ImageCropper from "./image-cropper";
import MathRenderer from "./math-renderer";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProblemSolver() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertProblemSchema),
    defaultValues: {
      question: "",
      imageUrl: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/problems", formData);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.solution?.error) {
        toast({
          title: "Error solving problem",
          description: data.solution.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Problem solved successfully!",
      });

      form.reset();
      setSelectedImage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit problem. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: { question: string; imageUrl?: string }) => {
    if (!values.question.trim()) {
      toast({
        title: "Error",
        description: "Question is required",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("question", values.question.trim());

    if (croppedImage) {
      try {
        // Convert base64 to blob
        const base64Response = await fetch(croppedImage);
        const blob = await base64Response.blob();

        // Create a File object from the blob
        const file = new File([blob], "image.jpg", { type: "image/jpeg" });
        formData.append("image", file);
      } catch (error) {
        console.error('Error processing image:', error);
        toast({
          title: "Error",
          description: "Failed to process image",
          variant: "destructive",
        });
        return;
      }
    }

    mutation.mutate(formData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
      // Set default question for math images
      form.setValue("question", "Please solve this math problem");
    }
  };

  const renderSolution = (text: string) => {
    const parts = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return <MathRenderer key={index} math={part.slice(2, -2)} block />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        return <MathRenderer key={index} math={part.slice(1, -1)} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="question"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Enter your math or science question here... Use $...$ for inline math and $$...$$ for block math"
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("image-upload")?.click()}
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Upload Image
            </Button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            <Button
              type="submit"
              className="gap-2"
              disabled={mutation.isPending}
            >
              <Upload className="h-4 w-4" />
              {mutation.isPending ? "Solving..." : "Solve Problem"}
            </Button>
          </div>
        </form>
      </Form>

      {selectedImage && (
        <Card>
          <CardContent className="pt-6">
            <img
              src={selectedImage}
              alt="Selected problem"
              className="max-h-[300px] object-contain mx-auto"
            />
          </CardContent>
        </Card>
      )}

      {mutation.data?.solution && (
        <Card>
          <CardContent className="pt-6 prose">
            <h3 className="text-lg font-semibold mb-2">Solution:</h3>
            <div className="whitespace-pre-wrap">
              {renderSolution(mutation.data.solution.text)}
            </div>
          </CardContent>
        </Card>
      )}

      {showCropper && selectedImage && (
        <ImageCropper
          imageUrl={selectedImage}
          isOpen={showCropper}
          onClose={() => setShowCropper(false)}
          onCrop={async (croppedImage) => {
            setSelectedImage(croppedImage);
            setCroppedImage(croppedImage);
            setShowCropper(false);

            const question = form.getValues().question.trim();
            if (!question) {
              toast({
                title: "Error",
                description: "Please enter a question before uploading an image",
                variant: "destructive",
              });
              return;
            }

            const formData = new FormData();
            formData.append("question", question);

            try {
              // Convert base64 to blob
              const base64Response = await fetch(croppedImage);
              const blob = await base64Response.blob();

              // Create a File object from the blob
              const file = new File([blob], "image.jpg", { type: "image/jpeg" });
              formData.append("image", file);

              // Submit directly to mutation
              await mutation.mutateAsync(formData);

              toast({
                title: "Success",
                description: "Image uploaded successfully",
              });
            } catch (error) {
              console.error('Error processing image:', error);
              toast({
                title: "Error",
                description: "Failed to process image",
                variant: "destructive",
              });
            }
          }}
        />
      )}
    </div>
  );
}