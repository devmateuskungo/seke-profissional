import BannerFindProfessional from "@/components/itembannercategoriaprofissional/itembannercategoriaProfissional";

import ProfessionalList from "@/components/itemcardprofissionallistcategoria/ProfessionalList";

export default function CategoriaProfissional() {
  return (
    <div className="container mx-auto  justify-center items-center">
        <BannerFindProfessional/>

        <div className="mt-4">
          <ProfessionalList/>
        </div>
    </div>
  )
}