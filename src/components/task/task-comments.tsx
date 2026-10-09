"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { boardStore } from "@/components/board/optimistic-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/initials";
import type { TaskComment } from "@/lib/task-types";
import { addComment, deleteComment, updateComment } from "@/server/tasks";

const timeFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export function TaskComments({
  slug,
  taskId,
  comments,
  viewerId,
}: {
  slug: string;
  taskId: string;
  comments: TaskComment[];
  viewerId: string;
}) {
  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4 border-t border-border/40 pt-6">
      <h3 id="comments-heading" className="text-sm font-semibold tracking-tight">
        Yorumlar <span className="text-muted-foreground">({comments.length})</span>
      </h3>
      {comments.length > 0 && (
        <ol className="flex flex-col gap-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} slug={slug} comment={comment} isOwn={comment.author.id === viewerId} />
          ))}
        </ol>
      )}
      <CommentComposer slug={slug} taskId={taskId} />
    </section>
  );
}

function CommentItem({ slug, comment, isOwn }: { slug: string; comment: TaskComment; isOwn: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [pending, startTransition] = useTransition();

  function save() {
    const body = draft.trim();
    if (!body || body === comment.body) {
      setEditing(false);
      setDraft(comment.body);
      return;
    }
    startTransition(async () => {
      const result = await boardStore.track(updateComment(slug, comment.id, body));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await boardStore.track(deleteComment(slug, comment.id));
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <li className="flex gap-3" aria-busy={pending} data-comment-id={comment.id}>
      <Avatar className="size-7">
        <AvatarFallback className="text-[10px]">{initials(comment.author.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{comment.author.name}</span>{" "}
          <time dateTime={comment.createdAt}>{timeFormat.format(new Date(comment.createdAt))}</time>
          {comment.editedAt && <span> (düzenlendi)</span>}
        </p>
        {editing ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`comment-edit-${comment.id}`} className="sr-only">
              Yorumu düzenle
            </label>
            <Textarea
              id={`comment-edit-${comment.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  save();
                } else if (e.key === "Escape") {
                  e.stopPropagation();
                  setEditing(false);
                  setDraft(comment.body);
                }
              }}
              maxLength={5000}
              autoFocus
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => (setEditing(false), setDraft(comment.body))}>
                Vazgeç
              </Button>
              <Button size="sm" onClick={save} disabled={pending}>
                Kaydet
              </Button>
            </div>
          </div>
        ) : (
          <p className="w-fit max-w-full rounded-xl rounded-tl-sm bg-muted/50 px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ring-1 ring-border/30 dark:bg-white/[0.04]">
            {comment.body}
          </p>
        )}
        {isOwn && !editing && (
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button size="xs" variant="ghost" className="text-muted-foreground" disabled={pending} />}
              >
                Sil
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Yorum silinsin mi?</AlertDialogTitle>
                  <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={remove}>
                    Yorumu sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </li>
  );
}

function CommentComposer({ slug, taskId }: { slug: string; taskId: string }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    const value = body.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await boardStore.track(addComment(slug, taskId, value));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
    });
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="new-comment" className="sr-only">
        Yorum yaz
      </label>
      <Textarea
        id="new-comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Yorum yaz… (Ctrl+Enter ile gönder)"
        maxLength={5000}
        disabled={pending}
      />
      <Button type="submit" size="sm" className="self-end" disabled={!body.trim() || pending}>
        {pending ? "Gönderiliyor…" : "Yorum yap"}
      </Button>
    </form>
  );
}
