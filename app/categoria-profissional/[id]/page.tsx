import ProfessionalProfileView from "@/components/itemcardprofissionallistcategoria/professional-profile-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProfessionalProfilePage({ params }: PageProps) {
  const { id } = await params;

  return <ProfessionalProfileView professionalId={id} />;
}
