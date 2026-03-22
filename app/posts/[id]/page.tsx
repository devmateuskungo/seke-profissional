import { ItemPostPublicacao } from "@/components/itempostpublicacao/itempostpublicacao"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 lg:py-10">
      <ItemPostPublicacao key={id} postId={id} />
    </div>
  )
}
