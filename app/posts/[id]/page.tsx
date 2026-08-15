import { ItemPostPublicacao } from "@/components/itempostpublicacao/itempostpublicacao"
import { PostDetailShell } from "@/components/post/post-detail-shell"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params

  return (
    <PostDetailShell>
      <ItemPostPublicacao key={id} postId={id} />
    </PostDetailShell>
  )
}
