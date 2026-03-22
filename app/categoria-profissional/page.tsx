import BannerFindProfessional from "@/components/itembannercategoriaprofissional/itembannercategoriaProfissional";

import ProfessionalList from "@/components/itemcardprofissionallistcategoria/ProfessionalList";

export default function CategoriaProfissional() {
  return (
    <div className="container mx-auto  lg:px-8 mt-4 py-20 justify-center items-center">
        <BannerFindProfessional/>

        <div className="mt-4">
          <ProfessionalList/>
        </div>
    </div>
  )
}