import { useState } from 'react';
import { MessageSquare, Send, ThumbsUp, ThumbsDown, CheckCircle, XCircle } from 'lucide-react';
import { Contract, Comment } from '../types/contract';
import { UserProfile } from '../types/user';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

interface CommentsApprovalProps {
  contract: Contract;
  currentUser: UserProfile;
  onAddComment: (content: string, type: 'comment' | 'approval' | 'rejection') => Promise<void>;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
}

export function CommentsApproval({
  contract,
  currentUser,
  onAddComment,
  onApprove,
  onReject,
}: CommentsApprovalProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (type: 'comment' | 'approval' | 'rejection' = 'comment') => {
    if (!newComment.trim() && type === 'comment') return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment || `${type === 'approval' ? 'Aprovado' : 'Rejeitado'}`, type);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCommentIcon = (type?: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejection':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
    }
  };

  const getCommentBadge = (type?: string) => {
    switch (type) {
      case 'approval':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Aprovado</Badge>;
      case 'rejection':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejeitado</Badge>;
      default:
        return null;
    }
  };

  const comments = contract.comments || [];
  const canApprove = currentUser.role === 'admin' || currentUser.role === 'gestor';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentários e Aprovações
            </CardTitle>
            <CardDescription>
              Histórico de comentários e decisões sobre este contrato
            </CardDescription>
          </div>
          {contract.approvalStatus && (
            <Badge
              className={
                contract.approvalStatus === 'approved'
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : contract.approvalStatus === 'rejected'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-yellow-100 text-yellow-800 border-yellow-300'
              }
            >
              {contract.approvalStatus === 'approved'
                ? 'Aprovado'
                : contract.approvalStatus === 'rejected'
                ? 'Rejeitado'
                : 'Pendente'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <ScrollArea className="h-[300px] pr-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm text-gray-600">Nenhum comentário ainda</p>
              <p className="text-xs text-gray-500">Seja o primeiro a comentar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                      {comment.user?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {comment.user}
                      </span>
                      {getCommentBadge(comment.type)}
                      <span className="text-xs text-gray-500">
                        {new Date(comment.timestamp).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      {getCommentIcon(comment.type)}
                      <p className="text-sm text-gray-700 break-words">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* New Comment Input */}
        <div className="space-y-3">
          <Textarea
            placeholder="Adicione um comentário ou observação..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
            disabled={isSubmitting}
          />
          <div className="flex gap-2 justify-end flex-wrap">
            <Button
              onClick={() => handleSubmit('comment')}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
              variant="outline"
            >
              <Send className="w-4 h-4 mr-2" />
              Comentar
            </Button>
            {canApprove && (
              <>
                <Button
                  onClick={() => handleSubmit('approval')}
                  disabled={isSubmitting}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  onClick={() => handleSubmit('rejection')}
                  disabled={isSubmitting}
                  size="sm"
                  variant="destructive"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
